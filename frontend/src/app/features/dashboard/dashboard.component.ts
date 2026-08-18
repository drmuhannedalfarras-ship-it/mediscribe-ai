import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly currentUser$ = this.authService.currentUser$;

  constructor(private readonly authService: AuthService) {}
}
