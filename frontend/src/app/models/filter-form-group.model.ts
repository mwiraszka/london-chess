import { FormControl } from '@angular/forms';

export interface FilterFormGroup {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  asWhite: FormControl<boolean>;
  asBlack: FormControl<boolean>;
  movesMin: FormControl<string>;
  movesMax: FormControl<string>;
  resultWhiteWon: FormControl<boolean>;
  resultDraw: FormControl<boolean>;
  resultBlackWon: FormControl<boolean>;
  resultInconclusive: FormControl<boolean>;
}
