import { pick } from '../utils/index.js';

export const FIRST_NAMES_M = [
  'James', 'Thomas', 'William', 'Henry', 'Arthur', 'Edmund', 'Robert', 'George',
  'Charles', 'Alfred', 'Frederick', 'Walter',
];

export const FIRST_NAMES_F = [
  'Eleanor', 'Mary', 'Alice', 'Grace', 'Florence', 'Edith', 'Beatrice', 'Clara',
  'Rose', 'Harriet', 'Agnes', 'Mabel',
];

export const SURNAMES = [
  'Ashford', 'Blackwood', 'Carmichael', 'Driscoll', 'Eastwick', 'Fairburn', 'Greaves',
  'Holloway', 'Inglewood', 'Kellgren', 'Lockhart', 'Mortimer', 'Northcott', 'Ogilvie',
  'Pendrake', 'Quincey', 'Ravenshaw', 'Sinclair', 'Thorne', 'Underwood', 'Vaughn',
  'Whitlock', 'Yardley',
];

export function randomName(sex) {
  return pick(sex === 'M' ? FIRST_NAMES_M : FIRST_NAMES_F);
}

export function randomSurname() {
  return pick(SURNAMES);
}
