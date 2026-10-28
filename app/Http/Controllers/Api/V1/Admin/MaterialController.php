<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ConversionStatus;
use App\Enums\MaterialType;
use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\Admin\ReorderMaterialsRequest;
use App\Http\Requests\Api\V1\Admin\StoreMaterialRequest;
use App\Http\Requests\Api\V1\Admin\UpdateMaterialRequest;
use App\Http\Resources\Admin\MaterialResource;
use App\Jobs\ConvertPresentationToPdf;
use App\Models\Course;
use App\Models\Material;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

final class MaterialController extends ApiController
{
    public function store(StoreMaterialRequest $request, Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        $file = $request->uploadedFile();
        $type = $request->materialType();
        $extension = mb_strtolower($file->getClientOriginalExtension());
        $isPdf = $extension === 'pdf';

        $path = $file->storeAs('courses/'.$course->id, Str::uuid().'.'.$extension, 'public');

        $material = $course->materials()->create([
            'type' => $type,
            'title' => $request->title ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'duration_seconds' => $type === MaterialType::Video && $request->filled('duration') ? $request->integer('duration') : null,
            'pdf_path' => $isPdf ? $path : null,
            'conversion_status' => $type === MaterialType::Video || $isPdf ? ConversionStatus::Ready : ConversionStatus::Pending,
            'position' => $course->materials()->count(),
        ]);

        if ($material->conversion_status === ConversionStatus::Pending) {
            dispatch(new ConvertPresentationToPdf($material));
        }

        return $this->created(new MaterialResource($material->refresh()), 'Material subido');
    }

    public function update(UpdateMaterialRequest $request, Material $material): JsonResponse
    {
        Gate::authorize('manage', $material->course);

        $material->update(['title' => $request->title]);

        return $this->success(new MaterialResource($material), 'Material actualizado');
    }

    public function destroy(Material $material): JsonResponse
    {
        Gate::authorize('manage', $material->course);

        $material->delete();

        return $this->noContent();
    }

    public function reorder(ReorderMaterialsRequest $request, Course $course): JsonResponse
    {
        Gate::authorize('manage', $course);

        foreach ($request->ids() as $position => $id) {
            $course->materials()->whereKey($id)->update(['position' => $position]);
        }

        return $this->success(MaterialResource::collection($course->materials()->get()), 'Orden actualizado');
    }

    public function retryConversion(Material $material): JsonResponse
    {
        Gate::authorize('manage', $material->course);

        if ($material->type !== MaterialType::Presentation || $material->conversion_status !== ConversionStatus::Failed) {
            return $this->error('Solo se puede reintentar una presentación cuya conversión falló.');
        }

        $material->update(['conversion_status' => ConversionStatus::Pending, 'conversion_error' => null]);
        dispatch(new ConvertPresentationToPdf($material));

        return $this->success(new MaterialResource($material), 'Conversión en cola');
    }
}
