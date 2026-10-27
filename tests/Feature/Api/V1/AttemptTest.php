<?php

declare(strict_types=1);

use App\Enums\QuestionType;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * An evaluation with one question of every type, worth 1 point each (5 total).
 *
 * @return array{evaluation: Evaluation, questions: array<string, Question>, options: array<string, QuestionOption>}
 */
function quiz(array $attributes = []): array
{
    $evaluation = Evaluation::factory()->for(Course::factory())->create(['passing_score' => 3, ...$attributes]);

    $single = Question::factory()->for($evaluation)->ofType(QuestionType::SingleChoice)->create(['position' => 0]);
    $multiple = Question::factory()->for($evaluation)->ofType(QuestionType::MultipleChoice)->create(['position' => 1]);
    $dropdown = Question::factory()->for($evaluation)->ofType(QuestionType::Dropdown)->create(['position' => 2]);
    $short = Question::factory()->for($evaluation)->ofType(QuestionType::ShortText)->create(['position' => 3, 'settings' => ['accepted_answers' => ['Fotosíntesis']]]);
    $paragraph = Question::factory()->for($evaluation)->ofType(QuestionType::Paragraph)->create(['position' => 4, 'required' => false]);

    return [
        'evaluation' => $evaluation,
        'questions' => ['single' => $single, 'multiple' => $multiple, 'dropdown' => $dropdown, 'short' => $short, 'paragraph' => $paragraph],
        'options' => [
            'single_ok' => QuestionOption::factory()->for($single)->correct()->create(),
            'single_bad' => QuestionOption::factory()->for($single)->create(),
            'multiple_a' => QuestionOption::factory()->for($multiple)->correct()->create(),
            'multiple_b' => QuestionOption::factory()->for($multiple)->correct()->create(),
            'multiple_bad' => QuestionOption::factory()->for($multiple)->create(),
            'dropdown_ok' => QuestionOption::factory()->for($dropdown)->correct()->create(),
            'dropdown_bad' => QuestionOption::factory()->for($dropdown)->create(),
        ],
    ];
}

function startAttempt(Evaluation $evaluation, string $dni = '12345678'): string
{
    Student::query()->firstOrCreate(['dni' => $dni], ['full_name' => 'Ana Pérez']);

    return test()->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => $dni])
        ->assertSuccessful()
        ->json('data.token');
}

it('starts an attempt for a DNI on the student list', function (): void {
    ['evaluation' => $evaluation] = quiz();
    $student = Student::factory()->create(['dni' => '01234567', 'full_name' => 'Ana Pérez', 'gerencia' => 'Operaciones', 'puesto' => 'Supervisora']);

    // Typed without the leading zero, as Excel would show it.
    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => ' 1234567 '])
        ->assertCreated()
        ->assertJsonPath('data.dni', '01234567')
        ->assertJsonPath('data.full_name', 'Ana Pérez')
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonMissingPath('data.gerencia');

    expect(Attempt::query()->sole())
        ->student_id->toBe($student->id)
        ->gerencia->toBe('Operaciones')
        ->puesto->toBe('Supervisora');
});

it('refuses DNIs that are not on the student list', function (): void {
    ['evaluation' => $evaluation] = quiz();

    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => '87654321'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dni');

    expect(Attempt::query()->count())->toBe(0);
});

it('validates the DNI', function (): void {
    ['evaluation' => $evaluation] = quiz();

    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => '12 34'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dni');
});

it('resumes the unfinished attempt of the same DNI', function (): void {
    ['evaluation' => $evaluation] = quiz();

    expect(startAttempt($evaluation))->toBe(startAttempt($evaluation));
});

it('grades every question type automatically', function (): void {
    ['evaluation' => $evaluation, 'questions' => $q, 'options' => $o] = quiz();
    $token = startAttempt($evaluation);

    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => [
        $q['single']->id => $o['single_ok']->id,
        $q['multiple']->id => [$o['multiple_b']->id, $o['multiple_a']->id],
        $q['dropdown']->id => $o['dropdown_bad']->id,
        $q['short']->id => '  fotosintesis ',
    ]])
        ->assertOk()
        ->assertJsonPath('data.status', 'graded')
        ->assertJsonPath('data.score', 3)
        ->assertJsonPath('data.max_score', 5)
        ->assertJsonPath('data.passed', true);
});

it('grades multiple choice as all or nothing', function (): void {
    ['evaluation' => $evaluation, 'questions' => $q, 'options' => $o] = quiz();
    $token = startAttempt($evaluation);

    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => [
        $q['single']->id => $o['single_bad']->id,
        $q['multiple']->id => [$o['multiple_a']->id],
        $q['dropdown']->id => $o['dropdown_ok']->id,
        $q['short']->id => 'otra cosa',
    ]])
        ->assertOk()
        ->assertJsonPath('data.score', 1)
        ->assertJsonPath('data.passed', false);
});

it('leaves paragraph answers pending until the admin grades them', function (): void {
    ['evaluation' => $evaluation, 'questions' => $q, 'options' => $o] = quiz();
    $token = startAttempt($evaluation);

    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => [
        $q['single']->id => $o['single_ok']->id,
        $q['multiple']->id => [$o['multiple_a']->id, $o['multiple_b']->id],
        $q['dropdown']->id => $o['dropdown_bad']->id,
        $q['short']->id => 'no',
        $q['paragraph']->id => 'Mi explicación',
    ]])
        ->assertOk()
        ->assertJsonPath('data.status', 'pending_review')
        ->assertJsonPath('data.score', 2)
        ->assertJsonPath('data.passed', null);

    $answer = Attempt::query()->where('token', $token)->sole()->answers()->where('question_id', $q['paragraph']->id)->sole();

    // The teacher who owns the course grades the open answer.
    $teacher = actingAsTeacher();
    $answer->attempt->evaluation->course->forceFill(['user_id' => $teacher->id])->save();

    $this->patchJson("/api/v1/admin/answers/{$answer->id}/grade", ['points' => 1])
        ->assertOk()
        ->assertJsonPath('data.status', 'graded')
        ->assertJsonPath('data.score', 3)
        ->assertJsonPath('data.passed', true);
});

it('requires the required questions', function (): void {
    ['evaluation' => $evaluation, 'questions' => $q] = quiz();
    $token = startAttempt($evaluation);

    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => [$q['short']->id => 'algo']])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(["answers.{$q['single']->id}", "answers.{$q['multiple']->id}"]);
});

it('ignores options that belong to other questions', function (): void {
    ['evaluation' => $evaluation, 'questions' => $q, 'options' => $o] = quiz(['passing_score' => 0]);
    $token = startAttempt($evaluation);

    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => [
        $q['single']->id => [$o['dropdown_ok']->id],
        $q['multiple']->id => [$o['multiple_a']->id, $o['multiple_b']->id, $o['single_ok']->id],
        $q['dropdown']->id => $o['dropdown_ok']->id,
        $q['short']->id => 'x',
    ]])->assertUnprocessable()->assertJsonValidationErrors("answers.{$q['single']->id}");
});

it('cannot submit the same attempt twice', function (): void {
    ['evaluation' => $evaluation, 'questions' => $q] = quiz();
    $q['single']->update(['required' => false]);
    $q['multiple']->update(['required' => false]);
    $q['dropdown']->update(['required' => false]);
    $q['short']->update(['required' => false]);
    $token = startAttempt($evaluation);

    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => []])->assertOk();
    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => []])->assertConflict();
});

it('limits the attempts per DNI', function (): void {
    ['evaluation' => $evaluation] = quiz(['max_attempts' => 1]);
    Student::factory()->create(['dni' => '12345678']);
    Student::factory()->create(['dni' => '87654321']);
    Attempt::factory()->for($evaluation)->submitted()->create(['dni' => '12345678']);

    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => '12345678'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dni');

    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => '87654321'])->assertCreated();
});

it('shows the correct answers only when the evaluation allows it', function (bool $show): void {
    ['evaluation' => $evaluation, 'questions' => $q, 'options' => $o] = quiz(['show_correct_answers' => $show]);
    $token = startAttempt($evaluation);

    $this->postJson("/api/v1/attempts/{$token}/submit", ['answers' => [
        $q['single']->id => $o['single_ok']->id,
        $q['multiple']->id => [$o['multiple_a']->id],
        $q['dropdown']->id => $o['dropdown_ok']->id,
        $q['short']->id => 'x',
    ]])->assertOk();

    $response = $this->getJson("/api/v1/attempts/{$token}")->assertOk();

    if ($show) {
        $response->assertJsonCount(5, 'data.review')->assertJsonPath('data.review.0.options.0.is_correct', true);
    } else {
        $response->assertJsonMissingPath('data.review');
        expect($response->getContent())->not->toContain('is_correct');
    }
})->with([true, false]);

it('refuses attempts on unavailable evaluations', function (): void {
    ['evaluation' => $evaluation] = quiz(['is_published' => false]);
    Student::factory()->create(['dni' => '12345678']);

    $this->postJson("/api/v1/evaluations/{$evaluation->id}/attempts", ['dni' => '12345678'])->assertNotFound();
});
