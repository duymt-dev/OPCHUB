import { directorProvinceOptions } from './director-province-options';

it('REQ-616 keeps catalogue order when a province is removed and restored', () => {
  const before = directorProvinceOptions(['Hà Nội', 'Hải Phòng', 'Quảng Ninh'], []);
  expect(before).toEqual(['Hà Nội', 'Hải Phòng', 'Quảng Ninh']);
  expect(directorProvinceOptions(['Hải Phòng', 'Quảng Ninh'], ['Hà Nội'])).toEqual(before);
  expect(directorProvinceOptions(['Hải Phòng', 'Quảng Ninh', 'Hà Nội'], [])).toEqual(before);
});

it('REQ-616 preserves available provinces without introducing a geographic restriction', () => {
  expect(directorProvinceOptions(['Đà Nẵng'], ['Hà Nội'])).toEqual(['Hà Nội', 'Đà Nẵng']);
});

it('REQ-616 retains unknown options and never mutates response arrays', () => {
  const assigned = Object.freeze(['Unknown province', 'Hải Phòng']);
  const unassigned = Object.freeze(['Hà Nội']);
  expect(directorProvinceOptions(assigned, unassigned)).toEqual([
    'Hà Nội',
    'Hải Phòng',
    'Unknown province',
  ]);
  expect(assigned).toEqual(['Unknown province', 'Hải Phòng']);
  expect(unassigned).toEqual(['Hà Nội']);
});
