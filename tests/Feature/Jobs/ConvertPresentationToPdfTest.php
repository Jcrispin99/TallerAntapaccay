<?php

declare(strict_types=1);

use App\Enums\ConversionStatus;
use App\Jobs\ConvertPresentationToPdf;
use App\Models\Material;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('public');
    $this->material = Material::factory()->presentation()->create(['path' => 'courses/1/tema.pptx']);
    Storage::disk('public')->put('courses/1/tema.pptx', 'pptx');
});

it('converts a presentation to PDF with LibreOffice', function (): void {
    config(['platform.libreoffice_path' => PHP_BINARY]);
    $outputDir = storage_path('app/conversions/'.$this->material->id);

    Process::fake(function () use ($outputDir) {
        File::put($outputDir.'/tema.pdf', '%PDF-1.4');

        return Process::result();
    });

    new ConvertPresentationToPdf($this->material)->handle();

    expect($this->material->refresh())
        ->conversion_status->toBe(ConversionStatus::Ready)
        ->pdf_path->toBe('courses/1/tema.pdf');
    Storage::disk('public')->assertExists('courses/1/tema.pdf');
    Process::assertRan(fn ($process): bool => in_array('--convert-to', $process->command, true));
    expect(File::isDirectory($outputDir))->toBeFalse();
});

it('marks the material as failed when LibreOffice is missing', function (): void {
    config(['platform.libreoffice_path' => '/nope/soffice']);

    new ConvertPresentationToPdf($this->material)->handle();

    expect($this->material->refresh())
        ->conversion_status->toBe(ConversionStatus::Failed)
        ->conversion_error->toContain('LibreOffice');
});

it('marks the material as failed when the conversion fails', function (): void {
    config(['platform.libreoffice_path' => PHP_BINARY]);
    Process::fake(fn () => Process::result(errorOutput: 'Error: source file could not be loaded', exitCode: 1));

    new ConvertPresentationToPdf($this->material)->handle();

    expect($this->material->refresh())
        ->conversion_status->toBe(ConversionStatus::Failed)
        ->conversion_error->toContain('source file could not be loaded');
});
