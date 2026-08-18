import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PatientsService } from '../../../core/services/patients.service';
import { Gender } from '../../../core/models/patient.model';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './patient-form.component.html',
})
export class PatientFormComponent {
  readonly genders = Object.values(Gender);

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    gender: [Gender.NOT_SPECIFIED, Validators.required],
    email: [''],
    phoneNumber: [''],
    address: [''],
    city: [''],
    country: [''],
  });

  submitting = false;
  errorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly patientsService: PatientsService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const value = this.form.getRawValue();

    this.patientsService
      .create({
        firstName: value.firstName!,
        lastName: value.lastName!,
        dateOfBirth: value.dateOfBirth!,
        gender: value.gender!,
        email: value.email || undefined,
        phoneNumber: value.phoneNumber || undefined,
        address: value.address || undefined,
        city: value.city || undefined,
        country: value.country || undefined,
      })
      .subscribe({
        next: (patient) => {
          this.submitting = false;
          this.router.navigate(['/patients', patient.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting = false;
          this.errorMessage = error.error?.message ?? 'Failed to create patient.';
        },
      });
  }
}
