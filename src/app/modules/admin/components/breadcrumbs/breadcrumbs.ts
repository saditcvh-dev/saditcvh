import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface BreadcrumbItem {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: false,
  templateUrl: './breadcrumbs.html',
})
export class Breadcrumbs implements OnInit, OnDestroy {
  breadcrumbs: BreadcrumbItem[] = [];
  private routerSubscription: any;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.updateBreadcrumbs();
    
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs(): void {
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Siempre agregar Dashboard como primer elemento
    breadcrumbs.push({
      label: 'Dashboard',
      url: '/admin/dashboard'
    });

    let route = this.activatedRoute.root;
    let fullPath = '';
    
    while (route.firstChild) {
      route = route.firstChild;
      const routeSnapshot = route.snapshot;
      
      const pathSegment = routeSnapshot.url.map(segment => segment.path).join('/');
      if (pathSegment) {
        fullPath += '/' + pathSegment;
      }
      
      const breadcrumbData = routeSnapshot.data['breadcrumb'];
      if (breadcrumbData && Array.isArray(breadcrumbData) && breadcrumbData.length > 0) {
        const breadcrumbItem = breadcrumbData[0];
        if (breadcrumbItem && breadcrumbItem.label && breadcrumbItem.label.toLowerCase() !== 'dashboard') {
          breadcrumbs.push({
            label: this.formatLabel(breadcrumbItem.label),
            url: breadcrumbItem.path || fullPath
          });
        }
      }
    }

    this.breadcrumbs = breadcrumbs;
  }

  private formatLabel(label: string): string {
    return label
      .charAt(0).toUpperCase() + label.slice(1)
      .replace(/-/g, ' ');
  }

  isLast(index: number): boolean {
    return index === this.breadcrumbs.length - 1;
  }

  // Método para navegación sin routerLink
  navigateTo(url: string): void {
    this.router.navigate([url]);
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}