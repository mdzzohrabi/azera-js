export interface File {
    name: string
    content?: Buffer | ReadableStream
    extension?: string
    createDate?: Date
    isDirectory?: boolean
}