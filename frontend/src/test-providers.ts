import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

// Every spec answers HTTP from the testing backend, so none can reach a real server
export default [provideHttpClient(), provideHttpClientTesting()];
