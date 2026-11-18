export function errorNotice(error) {
  const errors = error.raw?.issues || error.errors
  const details = Array.isArray(errors)
    ? errors
    : Object.entries(errors || {}).flatMap(([key, values]) =>
        (Array.isArray(values) ? values : [values]).map((value) => ({ message: `${key}: ${value}` })),
      )
  return { kind: 'error', text: error.message, details }
}
