import test from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_ROUTES, pathForView, viewForPath } from '../src/routes/adminRoutes.js'

test('every admin menu view has a stable unique URL', () => {
  const paths = Object.values(ADMIN_ROUTES)
  assert.equal(new Set(paths).size, paths.length)
  for (const [view, path] of Object.entries(ADMIN_ROUTES)) {
    assert.equal(pathForView(view), path)
    assert.equal(viewForPath(path), view)
  }
})

test('editor URLs map to the upload view', () => {
  assert.equal(pathForView('upload', 42), '/exams/42/edit')
  assert.equal(viewForPath('/exams/42/edit'), 'upload')
  assert.equal(viewForPath('/exams/new'), 'upload')
})

test('unknown views and paths fall back to dashboard', () => {
  assert.equal(pathForView('missing'), '/dashboard')
  assert.equal(viewForPath('/missing'), 'dashboard')
})
