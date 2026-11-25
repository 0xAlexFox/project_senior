export function normalizeFileQuery(value = {}) {
  return {
    format: ['png', 'jpg', 'pdf'].includes(value.format) ? value.format : '',
    source: ['web', 'api'].includes(value.source) ? value.source : '',
    sort: value.sort === 'oldest' ? 'oldest' : 'newest',
    page:
      /^\d{1,6}$/.test(String(value.page || '1')) && Number(value.page) > 0
        ? Number(value.page)
        : 1,
  }
}
export function selectFilesPage(files, criteria = {}) {
  const filter = normalizeFileQuery(criteria)
  const query = Array.from(String(criteria.query || ''))
    .slice(0, 200)
    .join('')
    .toLocaleLowerCase('ru-RU')
  const sorted = files
    .filter(
      (file) =>
        (!filter.format || file.format === filter.format) &&
        (!filter.source || file.source === filter.source) &&
        file.fileName.toLocaleLowerCase('ru-RU').includes(query),
    )
    .sort(
      (a, b) =>
        (filter.sort === 'oldest' ? 1 : -1) *
          (Date.parse(a.createdAt) - Date.parse(b.createdAt)) ||
        a.id.localeCompare(b.id),
    )
  const page = Math.min(filter.page, Math.max(1, Math.ceil(sorted.length / 20)))
  return {
    items: sorted.slice((page - 1) * 20, page * 20),
    total: sorted.length,
    page,
    pageSize: 20,
  }
}
