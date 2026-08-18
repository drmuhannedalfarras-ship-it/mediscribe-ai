import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ConsultationsService } from '../../../core/services/consultations.service';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './consultation-form.component.html',
})
export class ConsultationFormComponent implements OnInit {
  readonly form = this.fb.group({
    patientId: ['', Validators.required],
    reasonForVisit: ['', Validators.required],
    department: [''],
    specialty: [''],
    notes: [''],
  });

  submitting = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly consultationsService: ConsultationsService,
  ) {}

  ngOnInit(): void {
    const patientId = this.route.snapshot.queryParamMap.get('patientId');
    if (patientId) {
      this.form.patchValue({ patientId });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const value = this.form.getRawValue();

    this.consultationsService
      .create({
        patientId: value.patientId!,
        reasonForVisit: value.reasonForVisit!,
        department: value.department || undefined,
        specialty: value.specialty || undefined,
        notes: value.notes || undefined,
      })
      .subscribe({
        next: (consultation) => {
          this.submitting = false;
          this.router.navigate(['/consultations', consultation.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting = false;
          this.errorMessage = error.error?.message ?? 'Failed to create consultation.';
        },
      });
  }
}
