export type NationalEventType = 'libur' | 'cuti' | 'peringatan'

export interface NationalEvent {
  name: string
  type: NationalEventType
}

// Tanggal libur nasional dan cuti bersama resmi tahun 2026
const officialEvents2026: Record<string, NationalEvent[]> = {
  '2026-01-01': [{ name: 'Tahun Baru Masehi', type: 'libur' }],
  '2026-01-16': [{ name: 'Isra Mikraj Nabi Muhammad SAW', type: 'libur' }],
  '2026-02-16': [{ name: 'Cuti Bersama Tahun Baru Imlek', type: 'cuti' }],
  '2026-02-17': [{ name: 'Tahun Baru Imlek 2577 Kongzili', type: 'libur' }],
  '2026-03-18': [{ name: 'Cuti Bersama Hari Suci Nyepi', type: 'cuti' }],
  '2026-03-19': [{ name: 'Hari Suci Nyepi', type: 'libur' }],
  '2026-03-20': [{ name: 'Cuti Bersama Idulfitri', type: 'cuti' }],
  '2026-03-21': [{ name: 'Hari Raya Idulfitri 1447 H', type: 'libur' }],
  '2026-03-22': [{ name: 'Hari Raya Idulfitri 1447 H', type: 'libur' }],
  '2026-03-23': [{ name: 'Cuti Bersama Idulfitri', type: 'cuti' }],
  '2026-03-24': [{ name: 'Cuti Bersama Idulfitri', type: 'cuti' }],
  '2026-04-03': [{ name: 'Wafat Yesus Kristus', type: 'libur' }],
  '2026-04-05': [{ name: 'Kebangkitan Yesus Kristus (Paskah)', type: 'libur' }],
  '2026-05-01': [{ name: 'Hari Buruh Internasional', type: 'libur' }],
  '2026-05-14': [{ name: 'Kenaikan Yesus Kristus', type: 'libur' }],
  '2026-05-15': [{ name: 'Cuti Bersama Kenaikan Yesus Kristus', type: 'cuti' }],
  '2026-05-27': [{ name: 'Hari Raya Iduladha 1447 H', type: 'libur' }],
  '2026-05-28': [{ name: 'Cuti Bersama Iduladha', type: 'cuti' }],
  '2026-05-31': [{ name: 'Hari Raya Waisak 2570 BE', type: 'libur' }],
  '2026-06-01': [{ name: 'Hari Lahir Pancasila', type: 'libur' }],
  '2026-06-16': [{ name: 'Tahun Baru Islam 1448 H', type: 'libur' }],
  '2026-08-17': [{ name: 'Hari Kemerdekaan Republik Indonesia', type: 'libur' }],
  '2026-08-25': [{ name: 'Maulid Nabi Muhammad SAW', type: 'libur' }],
  '2026-12-24': [{ name: 'Cuti Bersama Hari Natal', type: 'cuti' }],
  '2026-12-25': [{ name: 'Hari Raya Natal', type: 'libur' }],
}

// Peringatan nasional dengan tanggal tetap setiap tahun.
// Jenis ini bukan berarti tanggal tersebut merupakan hari libur.
const nationalObservances: {
  month: number
  day: number
  name: string
}[] = [
  { month: 1, day: 3, name: 'Hari Amal Bakti Kementerian Agama' },
  { month: 1, day: 25, name: 'Hari Gizi Nasional' },
  { month: 2, day: 9, name: 'Hari Pers Nasional' },
  { month: 3, day: 1, name: 'Peringatan Serangan Umum 1 Maret' },
  { month: 3, day: 9, name: 'Hari Musik Nasional' },
  { month: 3, day: 24, name: 'Hari Tuberkulosis Sedunia' },
  { month: 4, day: 21, name: 'Hari Kartini' },
  { month: 4, day: 22, name: 'Hari Bumi' },
  { month: 5, day: 2, name: 'Hari Pendidikan Nasional' },
  { month: 5, day: 20, name: 'Hari Kebangkitan Nasional' },
  { month: 5, day: 29, name: 'Hari Lanjut Usia Nasional' },
  { month: 6, day: 1, name: 'Hari Lahir Pancasila' },
  { month: 6, day: 5, name: 'Hari Lingkungan Hidup Sedunia' },
  { month: 6, day: 21, name: 'Hari Krida Pertanian' },
  { month: 6, day: 24, name: 'Hari Bidan Nasional' },
  { month: 6, day: 29, name: 'Hari Keluarga Nasional' },
  { month: 7, day: 1, name: 'Hari Bhayangkara' },
  { month: 7, day: 12, name: 'Hari Koperasi Indonesia' },
  { month: 7, day: 22, name: 'Hari Kejaksaan' },
  { month: 7, day: 23, name: 'Hari Anak Nasional' },
  { month: 8, day: 10, name: 'Hari Veteran Nasional' },
  { month: 8, day: 14, name: 'Hari Pramuka' },
  { month: 8, day: 17, name: 'Hari Kemerdekaan Republik Indonesia' },
  { month: 9, day: 9, name: 'Hari Olahraga Nasional' },
  { month: 9, day: 11, name: 'Hari Radio Republik Indonesia' },
  { month: 9, day: 17, name: 'Hari Perhubungan Nasional' },
  { month: 9, day: 24, name: 'Hari Tani Nasional' },
  { month: 9, day: 27, name: 'Hari Bakti Postel' },
  { month: 9, day: 28, name: 'Hari Kereta Api Indonesia' },
  { month: 10, day: 1, name: 'Hari Kesaktian Pancasila' },
  { month: 10, day: 2, name: 'Hari Batik Nasional' },
  { month: 10, day: 5, name: 'Hari Tentara Nasional Indonesia' },
  { month: 10, day: 22, name: 'Hari Santri Nasional' },
  { month: 10, day: 28, name: 'Hari Sumpah Pemuda' },
  { month: 11, day: 10, name: 'Hari Pahlawan' },
  { month: 11, day: 12, name: 'Hari Kesehatan Nasional' },
  { month: 11, day: 25, name: 'Hari Guru Nasional' },
  { month: 12, day: 3, name: 'Hari Disabilitas Internasional' },
  { month: 12, day: 9, name: 'Hari Antikorupsi Sedunia' },
  { month: 12, day: 22, name: 'Hari Ibu' },
]

const pad = (value: number) => String(value).padStart(2, '0')

export function getIndonesiaEvents(date: Date): NationalEvent[] {
  const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  const official = officialEvents2026[key] ?? []

  const observances = nationalObservances
    .filter(
      (event) =>
        event.month === date.getMonth() + 1 &&
        event.day === date.getDate(),
    )
    .map((event) => ({
      name: event.name,
      type: 'peringatan' as const,
    }))

  // Hindari menampilkan nama peringatan yang sama dua kali.
  const combined = [...official, ...observances]

  return combined.filter(
    (event, index) =>
      combined.findIndex((item) => item.name === event.name) === index,
  )
}