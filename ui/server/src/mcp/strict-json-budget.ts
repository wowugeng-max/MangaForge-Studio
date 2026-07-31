export type StrictJsonScalar = string | number | boolean

export class StrictJsonBudget {
  private bytes = 0

  constructor(
    private readonly maximum: number,
    private readonly overflow: () => never,
  ) {}

  addAscii(bytes: number) {
    this.bytes += bytes
    if (this.bytes > this.maximum) this.overflow()
  }

  addScalar(value: StrictJsonScalar) {
    const serialized = JSON.stringify(value)
    this.addAscii(Buffer.byteLength(serialized, 'utf8'))
  }
}
