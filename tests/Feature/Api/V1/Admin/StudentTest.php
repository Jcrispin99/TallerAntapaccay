<?php

declare(strict_types=1);

use App\Models\Attempt;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;

uses(RefreshDatabase::class);

function csvUpload(string $content, string $name = 'alumnos.csv'): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'csv');
    file_put_contents($path, $content);

    return new UploadedFile($path, $name, 'text/csv', null, true);
}

it('is only for admins', function (): void {
    actingAsTeacher();

    $this->getJson('/api/v1/admin/students')->assertForbidden();
    $this->postJson('/api/v1/admin/students', ['dni' => '12345678', 'full_name' => 'X'])->assertForbidden();
});

it('lists, searches and filters students', function (): void {
    actingAsAdmin();
    Student::factory()->create(['full_name' => 'Rosa Quispe', 'gerencia' => 'Finanzas']);
    Student::factory()->create(['full_name' => 'Luis Mamani', 'gerencia' => 'Operaciones']);

    $this->getJson('/api/v1/admin/students')
        ->assertOk()
        ->assertJsonPath('data.meta.total', 2)
        ->assertJsonPath('data.gerencias', ['Finanzas', 'Operaciones']);

    $this->getJson('/api/v1/admin/students?search=quispe')->assertJsonCount(1, 'data.items');
    $this->getJson('/api/v1/admin/students?gerencia=Operaciones')->assertJsonPath('data.items.0.full_name', 'Luis Mamani');
});

it('adds, edits and removes a student', function (): void {
    actingAsAdmin();

    $id = $this->postJson('/api/v1/admin/students', ['dni' => '1234567', 'full_name' => 'Ana Pérez', 'gerencia' => 'Finanzas', 'puesto' => 'Analista'])
        ->assertCreated()
        ->assertJsonPath('data.dni', '01234567')
        ->json('data.id');

    $this->patchJson("/api/v1/admin/students/{$id}", ['dni' => '01234567', 'full_name' => 'Ana Pérez Ruiz', 'puesto' => 'Jefa'])
        ->assertOk()
        ->assertJsonPath('data.puesto', 'Jefa');

    $this->postJson('/api/v1/admin/students', ['dni' => '01234567', 'full_name' => 'Otra'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('dni');

    $this->deleteJson("/api/v1/admin/students/{$id}")->assertNoContent();
    expect(Student::query()->count())->toBe(0);
});

it('keeps past attempts when a student is removed', function (): void {
    actingAsAdmin();
    $student = Student::factory()->create();
    $attempt = Attempt::factory()->submitted()->create(['dni' => $student->dni, 'student_id' => $student->id, 'full_name' => $student->full_name]);

    $this->deleteJson("/api/v1/admin/students/{$student->id}")->assertNoContent();

    expect($attempt->refresh())->student_id->toBeNull()->full_name->toBe($student->full_name);
});

it('imports a CSV exported by Excel in Spanish', function (): void {
    actingAsAdmin();
    Student::factory()->create(['dni' => '11111111', 'full_name' => 'Nombre viejo']);

    // Semicolons, Windows-1252 accents, a DNI without its leading zero and a bad row.
    $csv = mb_convert_encoding("Apellidos y Nombres;DNI;Gerencia;Cargo\r\nPérez Ruiz, Ana;1234567;Finanzas;Analista\r\nQuispe, Rosa;11111111;Operaciones;Supervisora\r\nSin documento;;Finanzas;X\r\n", 'Windows-1252', 'UTF-8');

    $this->post('/api/v1/admin/students/import', ['file' => csvUpload($csv)], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.created', 1)
        ->assertJsonPath('data.updated', 1)
        ->assertJsonPath('data.skipped', 1)
        ->assertJsonPath('data.errors.0.row', 4);

    expect(Student::query()->where('dni', '01234567')->sole())
        ->full_name->toBe('Pérez Ruiz, Ana')
        ->gerencia->toBe('Finanzas')
        ->puesto->toBe('Analista')
        ->and(Student::query()->where('dni', '11111111')->sole()->full_name)->toBe('Quispe, Rosa');
});

it('imports an Excel file with separate first and last names', function (): void {
    actingAsAdmin();
    $path = tempnam(sys_get_temp_dir(), 'xlsx').'.xlsx';
    $writer = new Writer;
    $writer->openToFile($path);
    $writer->addRow(Row::fromValues(['N°', 'Nombres', 'Apellidos', 'Nro. DNI', 'Gerencia', 'Puesto']));
    $writer->addRow(Row::fromValues([1, 'Luis', 'Mamani Flores', 7654321, 'Operaciones', 'Operario']));
    $writer->close();

    $this->post('/api/v1/admin/students/import', ['file' => new UploadedFile($path, 'lista.xlsx', null, null, true)], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.created', 1);

    expect(Student::query()->sole())
        ->dni->toBe('07654321')
        ->full_name->toBe('Luis Mamani Flores')
        ->gerencia->toBe('Operaciones');
});

it('explains when the columns are missing', function (): void {
    actingAsAdmin();

    $this->post('/api/v1/admin/students/import', ['file' => csvUpload("Correo,Telefono\na@b.com,999\n")], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('file');
});
