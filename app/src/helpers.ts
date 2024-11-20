export async function getColumnTypes(prisma: any, tableName: string) {
  let columnTypes;
  try {
    const sql = `SELECT col.column_name,col.data_type FROM information_schema.columns AS col WHERE col.table_schema = 'public' AND col.table_name = '${tableName}'`;

    const result: any[] = await prisma.$queryRaw`${sql}`;

    columnTypes = result?.reduce(
      (
        acc: Record<string, string>,
        column: { column_name: string; data_type: string }
      ) => {
        acc[column.column_name] = column.data_type;
        return acc;
      },
      {}
    );
  } catch (error) {
    console.error("Error fetching column types:", error);
  }

  return columnTypes;
}
