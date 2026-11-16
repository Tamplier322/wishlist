
export interface DbDriver {

  init(): Promise<void>;
  getRow<Row>(sql: string, params?: readonly unknown[]): Promise<Row | null>;
  getRows<Row>(sql: string, params?: readonly unknown[]): Promise<Row[]>;
  execRun(sql: string, params?: readonly unknown[]): Promise<void>;
}
