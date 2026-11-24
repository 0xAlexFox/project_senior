// Local placeholder for GET formats, sourced from docs/api.md and REQ-04.
// This is UX validation only. The future backend must validate actual contents.
export const previewFormats = [
  {
    id: 'jpg_to_png',
    category: 'images',
    label: 'JPG → PNG',
    inputLabel: 'JPG или JPEG',
    extensions: ['jpg', 'jpeg'],
    mimeTypes: ['image/jpeg'],
    accept: '.jpg,.jpeg,image/jpeg',
    maxInputBytes: 10 * 1024 * 1024,
    limitLabel: '10 MiB',
    warning: '',
  },
  {
    id: 'png_to_jpg',
    category: 'images',
    label: 'PNG → JPG',
    inputLabel: 'PNG',
    extensions: ['png'],
    mimeTypes: ['image/png'],
    accept: '.png,image/png',
    maxInputBytes: 10 * 1024 * 1024,
    limitLabel: '10 MiB',
    warning:
      'Прозрачность заменится белым фоном. JPEG использует сжатие с потерями.',
  },
  {
    id: 'docx_to_pdf',
    category: 'documents',
    label: 'DOCX → PDF',
    inputLabel: 'DOCX',
    extensions: ['docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    accept:
      '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    maxInputBytes: 20 * 1024 * 1024,
    limitLabel: '20 MiB',
    warning:
      'Сложное оформление и нестандартные шрифты могут отличаться от оригинала.',
  },
]
