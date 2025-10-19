declare module 'unzipper' {
  type EntryType = 'File' | 'Directory'

  interface ZipEntry {
    path: string
    type: EntryType
    uncompressedSize?: number
  }

  interface CentralDirectory {
    files: ZipEntry[]
  }

  export const Open: {
    buffer(input: Buffer | Uint8Array): Promise<CentralDirectory>
  }

  export type { ZipEntry }
}
