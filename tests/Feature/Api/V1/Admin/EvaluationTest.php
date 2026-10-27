<?php

declare(strict_types=1);

use App\Models\Course;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn (): User => actingAsAdmin());

/**
 * @return array<string, mixed>
 */
function evaluationPayload(array $overrides = []): array
{
    return [
        'title' => 'Evaluación final',
        'description' => null,
        'passing_score' => 2,
        'max_attempts' => 2,
        'show_correct_answers' => true,
        'is_published' => true,
        'questions' => [
            [
                'type' => 'single_choice',
                'prompt' => '¿Capital del Perú?',
                'points' => 2,
                'required' => true,
                'options' => [
                    ['label' => 'Lima', 'is_correct' => true],
                    ['label' => 'Cusco', 'is_correct' => false],
                ],
            ],
            [
                'type' => 'short_text',
                'prompt' => 'Color del cielo',
                'points' => 1,
                'accepted_answers' => ['azul', 'celeste'],
            ],
            [
                'type' => 'paragraph',
                'prompt' => 'Explica el tema',
                'points' => 2,
            ],
        ],
        ...$overrides,
    ];
}

it('creates an empty evaluation the first time a course is opened', function (): void {
    $course = Course::factory()->create(['title' => 'Química']);

    $this->getJson("/api/v1/admin/courses/{$course->id}/evaluation")
        ->assertOk()
        ->assertJsonPath('data.title', 'Evaluación: Química')
        ->assertJsonPath('data.questions', []);
});

it('saves the whole form with its answer key', function (): void {
    $course = Course::factory()->create();

    $this->putJson("/api/v1/admin/courses/{$course->id}/evaluation", evaluationPayload())
        ->assertOk()
        ->assertJsonCount(3, 'data.questions')
        ->assertJsonPath('data.questions.0.options.0.is_correct', true)
        ->assertJsonPath('data.questions.1.accepted_answers', ['azul', 'celeste'])
        ->assertJsonPath('data.max_attempts', 2);
});

it('updates questions in place and soft-deletes the removed ones', function (): void {
    $course = Course::factory()->create();
    $saved = $this->putJson("/api/v1/admin/courses/{$course->id}/evaluation", evaluationPayload())->json('data');

    $first = $saved['questions'][0];
    $first['prompt'] = '¿Cuál es la capital del Perú?';
    $first['options'] = [$first['options'][0], ['label' => 'Arequipa', 'is_correct' => false]];

    $this->putJson("/api/v1/admin/courses/{$course->id}/evaluation", evaluationPayload(['questions' => [$first]]))
        ->assertOk()
        ->assertJsonCount(1, 'data.questions')
        ->assertJsonPath('data.questions.0.id', $first['id'])
        ->assertJsonPath('data.questions.0.prompt', '¿Cuál es la capital del Perú?')
        ->assertJsonPath('data.questions.0.options.1.label', 'Arequipa');

    expect(Question::query()->count())->toBe(1)
        ->and(Question::withTrashed()->count())->toBe(3)
        ->and(QuestionOption::onlyTrashed()->sole()->label)->toBe('Cusco');
});

it('requires an answer key on choice questions that give points', function (): void {
    $course = Course::factory()->create();
    $payload = evaluationPayload();
    $payload['questions'][0]['options'][0]['is_correct'] = false;

    $this->putJson("/api/v1/admin/courses/{$course->id}/evaluation", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('questions.0.options');
});

it('allows a single correct option on single choice questions', function (): void {
    $course = Course::factory()->create();
    $payload = evaluationPayload();
    $payload['questions'][0]['options'][1]['is_correct'] = true;

    $this->putJson("/api/v1/admin/courses/{$course->id}/evaluation", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('questions.0.options');
});

it('rejects a passing score above the total points', function (): void {
    $course = Course::factory()->create();

    $this->putJson("/api/v1/admin/courses/{$course->id}/evaluation", evaluationPayload(['passing_score' => 6]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('passing_score');
});
