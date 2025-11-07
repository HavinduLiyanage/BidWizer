const originalEnv = { ...process.env }

beforeEach(() => {
  process.env = { ...originalEnv }
  jest.restoreAllMocks()
  jest.spyOn(console, 'info').mockImplementation(() => undefined)
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
  jest.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterAll(() => {
  process.env = originalEnv
})
