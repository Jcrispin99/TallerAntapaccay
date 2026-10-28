<?php

declare(strict_types=1);

use App\Enums\ConversionStatus;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Material;
use App\Models\MaterialView;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->course = Course::factory()->create(['is_published' => true]);
    $this->video = Material::factory()->for($this->course)->create(['duration_seconds' => 300]);
    $this->student = Student::factory()->create(['dni' => '12345678', 'full_name' => 'Rosa Quispe']);
});

function reportProgress(Material $material, int $seconds, ?int $duration = null): TestResponse
{
    return test()->postJson("/api/v1/materials/{$material->id}/progress", ['dni' => '12345678', 'seconds' => $seconds, 'duration' => $duration]);
}

it('identifies the student and returns their progress in the course', function (): void {
    MaterialView::factory()->for($this->video)->for($this->student)->create(['seconds_watched' => 120]);
    MaterialView::factory()->for($this->student)->create();

    $this->postJson("/api/v1/courses/{$this->course->slug}/progress", ['dni' => '1234-5678'])
        ->assertOk()
        ->assertJsonPath('data.student.full_name', 'Rosa Quispe')
        ->assertJsonPath('data.progress', [['material_id' => $this->video->id, 'seconds_watched' => 120, 'completed' => false]]);
});

it('rejects a DNI that is not on the list', function (): void {
    $this->postJson("/api/v1/courses/{$this->course->slug}/progress", ['dni' => '87654321'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dni');
});

it('hides the progress of unpublished courses', function (): void {
    $this->course->update(['is_published' => false]);

    $this->postJson("/api/v1/courses/{$this->course->slug}/progress", ['dni' => '12345678'])->assertNotFound();
    reportProgress($this->video, 10)->assertNotFound();
});

it('does not let a video advance faster than real time', function (): void {
    // A single report cannot jump to the end.
    reportProgress($this->video, 300)->assertOk()->assertJsonPath('data.seconds_watched', 15)->assertJsonPath('data.completed', false);

    // After 60 seconds, at most twice that (2x speed) plus a margin.
    $this->travel(60)->seconds();
    reportProgress($this->video, 300)->assertJsonPath('data.seconds_watched', 150);

    // Going back does not lose progress.
    reportProgress($this->video, 40)->assertJsonPath('data.seconds_watched', 150);
});

it('completes a video watched to the end', function (): void {
    foreach (range(15, 300, 15) as $seconds) {
        $this->travel(15)->seconds();
        $response = reportProgress($this->video, $seconds);
    }

    $response->assertJsonPath('data.completed', true);
    expect($this->video->views()->sole()->completed_at)->not->toBeNull();
});

it('uses the duration seen by the player when the upload did not record one', function (): void {
    $this->video->update(['duration_seconds' => null]);

    reportProgress($this->video, 8, duration: 10)->assertJsonPath('data.completed', true);
});

it('marks a presentation as seen when opened', function (): void {
    $presentation = Material::factory()->for($this->course)->presentation(ConversionStatus::Ready)->create();

    $this->postJson("/api/v1/materials/{$presentation->id}/progress", ['dni' => '12345678'])
        ->assertOk()
        ->assertJsonPath('data.completed', true);
});

it('opens the evaluation only after every material is completed', function (): void {
    $evaluation = Evaluation::factory()->for($this->course)->create(['is_published' => true]);
    QuestionOption::factory()->for(Question::factory()->for($evaluation))->correct()->create();

    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => '12345678'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dni');

    MaterialView::factory()->for($this->video)->for($this->student)->completed()->create(['seconds_watched' => 300]);

    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => '12345678'])->assertCreated();
});
