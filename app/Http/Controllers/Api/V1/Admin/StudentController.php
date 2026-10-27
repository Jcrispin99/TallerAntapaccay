<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\Admin\ImportStudentsRequest;
use App\Http\Requests\Api\V1\Admin\StudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Services\StudentImporter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The list of students allowed to take evaluations (admins only).
 */
final class StudentController extends ApiController
{
    /**
     * Query: search (DNI or name), gerencia, page.
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->toString();
        $gerencia = $request->string('gerencia')->toString();

        $page = Student::query()
            ->when($search !== '', fn (Builder $query) => $query->where(
                fn (Builder $query) => $query->where('dni', 'like', "%{$search}%")->orWhere('full_name', 'like', "%{$search}%"),
            ))
            ->when($gerencia !== '', fn (Builder $query) => $query->where('gerencia', $gerencia))
            ->withCount('attempts')
            ->orderBy('full_name')
            ->paginate(50);

        return $this->success([
            'items' => StudentResource::collection($page->items()),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
            'gerencias' => Student::query()->whereNotNull('gerencia')->distinct()->orderBy('gerencia')->pluck('gerencia'),
        ]);
    }

    public function store(StudentRequest $request): JsonResponse
    {
        return $this->created(new StudentResource(Student::query()->create($request->validated())), 'Alumno agregado');
    }

    public function update(StudentRequest $request, Student $student): JsonResponse
    {
        $student->update($request->validated());

        return $this->success(new StudentResource($student), 'Alumno actualizado');
    }

    /**
     * Their past attempts stay in the results, with the data copied when they took them.
     */
    public function destroy(Student $student): JsonResponse
    {
        $student->delete();

        return $this->noContent();
    }

    public function import(ImportStudentsRequest $request, StudentImporter $importer): JsonResponse
    {
        $file = $request->uploadedFile();

        $result = $importer->import($file->getRealPath(), $file->getClientOriginalExtension());

        return $this->success($result, "Importación lista: {$result['created']} nuevos, {$result['updated']} actualizados.");
    }
}
