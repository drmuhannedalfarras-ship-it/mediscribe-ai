import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../core/services/auth.service';
import { ConsultationsService } from '../../../core/services/consultations.service';
import { ConsultationResponseDto } from '../../../core/models/consultation.model';
import { SystemRole } from '../../../core/models/auth.model';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './consultation-list.component.html',
})
export class ConsultationListComponent implements OnInit {
  readonly displayedColumns = ['reasonForVisit', 'status', 'department', 'createdAt'];
  readonly lookupForm = this.fb.group({
    mode: ['patient'],
    lookupId: [''],
  });

  consultations: ConsultationResponseDto[] = [];
  loading = false;
  searched = false;
  isPhysician = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly consultationsService: ConsultationsService,
  ) {}

  ngOnInit(): void {
    this.isPhysician = this.authService.getRoles().includes(SystemRole.PHYSICIAN);
    if (this.isPhysician) {
      const physicianId = this.authService.getCurrentUserId();
      if (physicianId) {
        this.lookupForm.patchValue({ mode: 'physician', lookupId: physicianId });
        this.search();
      }
    }
  }

  search(): void {
    const { mode, lookupId } = this.lookupForm.getRawValue();
    if (!lookupId) {
      return;
    }

    this.loading = true;
    this.searched = true;
    const request$ =
      mode === 'physician'
        ? this.consultationsService.listByPhysician(lookupId)
        : this.consultationsService.listByPatient(lookupId);

    request$.subscribe({
      next: (response) => {
        this.consultations = response.data;
        this.loading = false;
      },
      error: () => {
        this.consultations = [];
        this.loading = false;
      },
    });
  }
}
