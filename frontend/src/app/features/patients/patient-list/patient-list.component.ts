import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PatientsService } from '../../../core/services/patients.service';
import { PatientResponseDto } from '../../../core/models/patient.model';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatTableModule, MatPaginatorModule],
  templateUrl: './patient-list.component.html',
})
export class PatientListComponent implements OnInit {
  readonly displayedColumns = ['mrn', 'fullName', 'age', 'gender', 'status'];
  patients: PatientResponseDto[] = [];
  total = 0;
  pageSize = 25;
  pageIndex = 0;
  loading = false;

  constructor(private readonly patientsService: PatientsService) {}

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    this.loading = true;
    this.patientsService.list(this.pageIndex * this.pageSize, this.pageSize).subscribe({
      next: (response) => {
        this.patients = response.data;
        this.total = response.pagination.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPage();
  }
}
