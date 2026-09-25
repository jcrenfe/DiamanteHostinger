import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';
import { apiBaseUrl } from '../utils/api-base';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {
  transform(path?: string): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('assets/') || path.startsWith('/assets/')) {
      return path;
    }
    const baseUrl = apiBaseUrl(environment.apiUrl);
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return baseUrl + cleanPath;
  }
}
