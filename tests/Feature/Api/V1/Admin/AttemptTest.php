<?php

declare(strict_types=1);

use App\Enums\AttemptStatus;
use App\Enums\QuestionType;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    actingAsAdmin();
    $this->course = Course::factory()->create(['title' => 'Biología']);
    $this->evaluation = Evaluation::factory()->for($this->course)->create(['passing_score' => 1]);
    $this->question = Question::factory()->for($this->evaluation)->ofType(QuestionType::SingleChoice)->create(['prompt' => '¿Color?']);
    $this->option = QuestionOption::factory()->for($this->question)->correct()->create(['label' => 'Verde']);
});

function submittedAttempt(string $dni, float $score, AttemptStatus $status = AttemptStatus::Graded): Attempt
{
    $attempt = Attempt::factory()->for(test()->evaluation)->submitted()->create([
        'dni' => $dni,
        'score' => $score,
        'max_score' => 1,
        'status' => $status,
        'passed' => $status === AttemptStatus::Graded ? $score >= 1 : null,
    ]);

    $attempt->answers()->create([
        'question_id' => test()->question->id,
        'selected_option_ids' => [test()->option->id],
        'points_awarded' => $score,
        'is_correct' => $score >= 1,
    ]);

    return $attempt;
}

it('lists submitted attempts with a summary', function (): void {
    submittedAttempt('11111111', 1);
    submittedAttempt('22222222', 0);
    submittedAttempt('33333333', 0, AttemptStatus::PendingReview);
    Attempt::factory()->for($this->evaluation)->create(); // still in progress

    $this->getJson("/api/v1/admin/courses/{$this->course->id}/attempts")
        ->assertOk()
        ->assertJsonCount(3, 'data.items')
        ->assertJsonPath('data.meta.total', 3)
        ->assertJsonPath('data.summary.attempts', 3)
        ->assertJsonPath('data.summary.passed', 1)
        ->assertJsonPath('data.summary.pending_review', 1)
        ->assertJsonPath('data.summary.average_score', 0.5);
});

it('searches attempts by DNI or name and filters by gerencia', function (): void {
    submittedAttempt('11111111', 1)->update(['full_name' => 'Rosa Quispe', 'gerencia' => 'Finanzas']);
    submittedAttempt('22222222', 0)->update(['gerencia' => 'Operaciones']);

    $this->getJson("/api/v1/admin/courses/{$this->course->id}/attempts?filter[search]=quispe")
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.dni', '11111111')
        ->assertJsonPath('data.gerencias', ['Finanzas', 'Operaciones']);

    $this->getJson("/api/v1/admin/courses/{$this->course->id}/attempts?filter[gerencia]=Operaciones")
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.dni', '22222222');
});

it('shows an attempt with its answers', function (): void {
    $attempt = submittedAttempt('11111111', 1);

    $this->getJson("/api/v1/admin/attempts/{$attempt->id}")
        ->assertOk()
        ->assertJsonPath('data.answers.0.question.prompt', '¿Color?')
        ->assertJsonPath('data.answers.0.options.0.label', 'Verde');
});

it('does not allow more points than the question is worth', function (): void {
    $answer = submittedAttempt('11111111', 0)->answers()->sole();

    $this->patchJson("/api/v1/admin/answers/{$answer->id}/grade", ['points' => 5])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('points');
});

it('exports the results as CSV', function (): void {
    submittedAttempt('11111111', 1);

    $response = $this->get("/api/v1/admin/courses/{$this->course->id}/attempts/export")
        ->assertOk()
        ->assertDownload('resultados-biologia.csv');

    $csv = $response->streamedContent();

    expect($csv)->toContain('DNI,Nombre,Gerencia,Puesto')
        ->toContain('¿Color?')
        ->toContain('11111111')
        ->toContain('Verde');
});
