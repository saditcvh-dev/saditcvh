import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/public/home', pathMatch: 'full' },
  {
    path: 'public',
    loadChildren: () => import('./modules/public/public-module').then(m => m.PublicModule)
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./modules/auth/auth-module').then(m => m.AuthModule)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./modules/admin/admin-module').then(m => m.AdminModule),
    // canLoad: [AuthGuard]
  },
  { path: '**', redirectTo: '/public/notfound' }
];
