using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Dapper;
using Microsoft.Extensions.Configuration;
using MySql.Data.MySqlClient;
using WholesaleShoeStore.Models;
using WholesaleShoeStore.ViewModels;

namespace WholesaleShoeStore.Repositories
{
    public interface IGenericRepository<T> where T : BaseEntity
    {
        Task<T> GetByIdAsync(int id);
        Task<IEnumerable<T>> GetAllAsync();
        Task<int> AddAsync(T entity);
        Task<bool> UpdateAsync(T entity);
        Task<bool> DeleteAsync(int id);
        Task<bool> SoftDeleteAsync(int id);
        Task<IEnumerable<T>> QueryAsync(string sql, object parameters = null);
        Task<T> QuerySingleAsync(string sql, object parameters = null);
        Task<T> QuerySingleOrDefaultAsync(string sql, object parameters = null);
        Task<T> QueryFirstAsync(string sql, object parameters = null);
        Task<T> QueryFirstOrDefaultAsync(string sql, object parameters = null);
        Task<TResult> ExecuteScalarAsync<TResult>(string sql, object parameters = null);
        Task<int> ExecuteAsync(string sql, object parameters = null);
        Task<IEnumerable<T>> FindAsync(string whereClause, object parameters = null);
        Task<IEnumerable<T>> GetOrderedAsync(string orderByClause);
        Task<IEnumerable<T>> FindOrderedAsync(string whereClause, string orderByClause, object parameters = null);
        Task<int> CountAsync(string whereClause = "", object parameters = null);
        Task<bool> AnyAsync(string whereClause, object parameters = null);
        Task<PagedResult<T>> GetPagedAsync(int pageNumber, int pageSize, string orderByClause = "Id");
        Task<PagedResult<T>> FindPagedAsync(string whereClause, object parameters, int pageNumber, int pageSize, string orderByClause = "Id");
        Task<PagedResult<T>> GetPagedAsync(BaseFilter filter);
        Task<PagedResult<T>> GetPagedDynamicAsync(string dynamicWhere, object parameters, BaseFilter filter);
        Task<IEnumerable<TResult>> QueryWithJoinAsync<TJoin, TResult>(string sql, Func<T, TJoin, TResult> map, object parameters = null, string splitOn = "Id");
        Task<IEnumerable<TResult>> QueryWithTwoJoinsAsync<TJoin1, TJoin2, TResult>(string sql, Func<T, TJoin1, TJoin2, TResult> map, object parameters = null, string splitOn = "Id,Id");
        Task<IEnumerable<TResult>> QueryWithThreeJoinsAsync<TJoin1, TJoin2, TJoin3, TResult>(string sql, Func<T, TJoin1, TJoin2, TJoin3, TResult> map, object parameters = null, string splitOn = "Id,Id,Id");
        Task<SqlMapper.GridReader> QueryMultipleAsync(string sql, object parameters = null);
        Task<int> AddRangeAsync(IEnumerable<T> entities);
        Task<int> UpdateRangeAsync(IEnumerable<T> entities);
        Task<int> DeleteRangeAsync(IEnumerable<int> ids);
        Task<int> SoftDeleteRangeAsync(IEnumerable<int> ids);
        Task<TResult> ExecuteTransactionAsync<TResult>(Func<IDbConnection, IDbTransaction, Task<TResult>> operation);
        Task ExecuteTransactionAsync(Func<IDbConnection, IDbTransaction, Task> operation);
    }

    public class GenericRepository<T> : IGenericRepository<T> where T : BaseEntity
    {
        protected readonly string _connectionString;
        protected readonly string _tableName;

        public GenericRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
            _tableName = typeof(T).Name;
        }

        protected IDbConnection CreateConnection()
        {
            return new MySqlConnection(_connectionString);
        }

        protected string GenerateInsertQuery()
        {
            var properties = typeof(T).GetProperties()
                .Where(p => p.Name != "Id" && !p.PropertyType.IsGenericType && !typeof(BaseEntity).IsAssignableFrom(p.PropertyType))
                .ToList();

            var columns = string.Join(", ", properties.Select(p => p.Name));
            var parameters = string.Join(", ", properties.Select(p => $"@{p.Name}"));

            return $"INSERT INTO {_tableName} ({columns}) VALUES ({parameters}); SELECT LAST_INSERT_ID();";
        }

        protected string GenerateUpdateQuery()
        {
            var properties = typeof(T).GetProperties()
                .Where(p => p.Name != "Id" && !p.PropertyType.IsGenericType && !typeof(BaseEntity).IsAssignableFrom(p.PropertyType))
                .ToList();

            var setStatements = string.Join(", ", properties.Select(p => $"{p.Name} = @{p.Name}"));

            return $"UPDATE {_tableName} SET {setStatements}, UpdatedAt = UTC_TIMESTAMP() WHERE Id = @Id";
        }

        protected string GenerateBulkInsertQuery(int count)
        {
            var properties = typeof(T).GetProperties()
                .Where(p => p.Name != "Id" && !p.PropertyType.IsGenericType && !typeof(BaseEntity).IsAssignableFrom(p.PropertyType))
                .ToList();

            var columns = string.Join(", ", properties.Select(p => p.Name));

            var valueSets = new List<string>();
            for (int i = 0; i < count; i++)
            {
                var parameters = string.Join(", ", properties.Select(p => $"@{p.Name}{i}"));
                valueSets.Add($"({parameters})");
            }

            var valuesSql = string.Join(", ", valueSets);

            return $"INSERT INTO {_tableName} ({columns}) VALUES {valuesSql}";
        }

        protected object CreateBulkParameters(IEnumerable<T> entities)
        {
            var properties = typeof(T).GetProperties()
                .Where(p => p.Name != "Id" && !p.PropertyType.IsGenericType && !typeof(BaseEntity).IsAssignableFrom(p.PropertyType))
                .ToList();

            var parameters = new DynamicParameters();
            var entityList = entities.ToList();

            for (int i = 0; i < entityList.Count; i++)
            {
                var entity = entityList[i];

                foreach (var prop in properties)
                {
                    parameters.Add($"{prop.Name}{i}", prop.GetValue(entity));
                }
            }

            return parameters;
        }

        protected string ApplyFilter(BaseFilter filter)
        {
            if (filter == null)
            {
                return $"ORDER BY Id ASC LIMIT 10 OFFSET 0";
            }

            var sortBy = filter.SortBy.Replace("'", "''").Replace(";", "");
            var sortDirection = filter.SortAscending ? "ASC" : "DESC";
            var limit = Math.Max(1, Math.Min(filter.PageSize, 100));
            var offset = Math.Max(0, (filter.PageNumber - 1) * limit);

            return $"ORDER BY {sortBy} {sortDirection} LIMIT {limit} OFFSET {offset}";
        }

        protected string BuildWhereClause(string whereClause = "")
        {
            return string.IsNullOrWhiteSpace(whereClause) ? "" : $" WHERE {whereClause}";
        }

        public async Task<T> GetByIdAsync(int id)
        {
            using (var connection = CreateConnection())
            {
                var sql = $"SELECT * FROM {_tableName} WHERE Id = @Id";
                return await connection.QueryFirstOrDefaultAsync<T>(sql, new { Id = id });
            }
        }

        public async Task<IEnumerable<T>> GetAllAsync()
        {
            using (var connection = CreateConnection())
            {
                var sql = $"SELECT * FROM {_tableName}";
                return await connection.QueryAsync<T>(sql);
            }
        }

        public async Task<int> AddAsync(T entity)
        {
            using (var connection = CreateConnection())
            {
                var sql = GenerateInsertQuery();
                return await connection.ExecuteScalarAsync<int>(sql, entity);
            }
        }

        public async Task<bool> UpdateAsync(T entity)
        {
            using (var connection = CreateConnection())
            {
                var sql = GenerateUpdateQuery();
                return await connection.ExecuteAsync(sql, entity) > 0;
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            using (var connection = CreateConnection())
            {
                var sql = $"DELETE FROM {_tableName} WHERE Id = @Id";
                return await connection.ExecuteAsync(sql, new { Id = id }) > 0;
            }
        }

        public async Task<bool> SoftDeleteAsync(int id)
        {
            using (var connection = CreateConnection())
            {
                var sql = $"UPDATE {_tableName} SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP() WHERE Id = @Id";
                return await connection.ExecuteAsync(sql, new { Id = id }) > 0;
            }
        }

        public async Task<IEnumerable<T>> QueryAsync(string sql, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                return await connection.QueryAsync<T>(sql, parameters);
            }
        }

        public async Task<T> QuerySingleAsync(string sql, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                return await connection.QuerySingleAsync<T>(sql, parameters);
            }
        }

        public async Task<T> QuerySingleOrDefaultAsync(string sql, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                return await connection.QuerySingleOrDefaultAsync<T>(sql, parameters);
            }
        }

        public async Task<T> QueryFirstAsync(string sql, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                return await connection.QueryFirstAsync<T>(sql, parameters);
            }
        }

        public async Task<T> QueryFirstOrDefaultAsync(string sql, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<T>(sql, parameters);
            }
        }

        public async Task<TResult> ExecuteScalarAsync<TResult>(string sql, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                return await connection.ExecuteScalarAsync<TResult>(sql, parameters);
            }
        }

        public async Task<int> ExecuteAsync(string sql, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                return await connection.ExecuteAsync(sql, parameters);
            }
        }

        public async Task<IEnumerable<T>> FindAsync(string whereClause, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                var sql = $"SELECT * FROM {_tableName}{BuildWhereClause(whereClause)}";
                return await connection.QueryAsync<T>(sql, parameters);
            }
        }

        public async Task<IEnumerable<T>> GetOrderedAsync(string orderByClause)
        {
            using (var connection = CreateConnection())
            {
                var sql = $"SELECT * FROM {_tableName} ORDER BY {orderByClause}";
                return await connection.QueryAsync<T>(sql);
            }
        }

        public async Task<IEnumerable<T>> FindOrderedAsync(string whereClause, string orderByClause, object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                var sql = $"SELECT * FROM {_tableName}{BuildWhereClause(whereClause)} ORDER BY {orderByClause}";
                return await connection.QueryAsync<T>(sql, parameters);
            }
        }

        public async Task<int> CountAsync(string whereClause = "", object parameters = null)
        {
            using (var connection = CreateConnection())
            {
                var sql = $"SELECT COUNT(*) FROM {_tableName}{BuildWhereClause(whereClause)}";
                return await connection.ExecuteScalarAsync<int>(sql, parameters);
            }
        }

        public async Task<bool> AnyAsync(string whereClause, object parameters = null)
        {
            return await CountAsync(whereClause, parameters) > 0;
        }

        public async Task<PagedResult<T>> GetPagedAsync(int pageNumber, int pageSize, string orderByClause = "Id")
        {
            using (var connection = CreateConnection())
            {
                pageNumber = Math.Max(1, pageNumber);
                pageSize = Math.Max(1, Math.Min(pageSize, 100));

                var offset = (pageNumber - 1) * pageSize;

                var sql = $@"
                    SELECT COUNT(*) FROM {_tableName};
                    SELECT * FROM {_tableName} ORDER BY {orderByClause} LIMIT {pageSize} OFFSET {offset}";

                using (var multi = await connection.QueryMultipleAsync(sql))
                {
                    var totalCount = await multi.ReadFirstAsync<int>();
                    var items = await multi.ReadAsync<T>();

                    return new PagedResult<T>
                    {
                        Items = items.ToList(),
                        PageNumber = pageNumber,
                        PageSize = pageSize,
                        TotalCount = totalCount,
                        TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                    };
                }
            }
        }

        public async Task<PagedResult<T>> FindPagedAsync(string whereClause, object parameters, int pageNumber, int pageSize, string orderByClause = "Id")
        {
            using (var connection = CreateConnection())
            {
                pageNumber = Math.Max(1, pageNumber);
                pageSize = Math.Max(1, Math.Min(pageSize, 100));

                var offset = (pageNumber - 1) * pageSize;
                var where = BuildWhereClause(whereClause);

                var sql = $@"
                    SELECT COUNT(*) FROM {_tableName}{where};
                    SELECT * FROM {_tableName}{where} ORDER BY {orderByClause} LIMIT {pageSize} OFFSET {offset}";

                using (var multi = await connection.QueryMultipleAsync(sql, parameters))
                {
                    var totalCount = await multi.ReadFirstAsync<int>();
                    var items = await multi.ReadAsync<T>();

                    return new PagedResult<T>
                    {
                        Items = items.ToList(),
                        PageNumber = pageNumber,
                        PageSize = pageSize,
                        TotalCount = totalCount,
                        TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
                    };
                }
            }
        }

        public async Task<PagedResult<T>> GetPagedAsync(BaseFilter filter)
        {
            using (var connection = CreateConnection())
            {
                filter.PageNumber = Math.Max(1, filter.PageNumber);
                filter.PageSize = Math.Max(1, Math.Min(filter.PageSize, 100));

                var offset = (filter.PageNumber - 1) * filter.PageSize;
                var sortDirection = filter.SortAscending ? "ASC" : "DESC";

                var sql = $@"
                    SELECT COUNT(*) FROM {_tableName};
                    SELECT * FROM {_tableName} ORDER BY {filter.SortBy} {sortDirection} LIMIT {filter.PageSize} OFFSET {offset}";

                using (var multi = await connection.QueryMultipleAsync(sql))
                {
                    var totalCount = await multi.ReadFirstAsync<int>();
                    var items = await multi.ReadAsync<T>();

                    return new PagedResult<T>
                    {
                        Items = items.ToList(),
                        PageNumber = filter.PageNumber,
                        PageSize = filter.PageSize,
                        TotalCount = totalCount,
                        TotalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize)
                    };
                }
            }
        }

        public async Task<PagedResult<T>> GetPagedDynamicAsync(string dynamicWhere, object parameters, BaseFilter filter)
        {
            using (var connection = CreateConnection())
            {
                filter.PageNumber = Math.Max(1, filter.PageNumber);
                filter.PageSize = Math.Max(1, Math.Min(filter.PageSize, 100));

                var offset = (filter.PageNumber - 1) * filter.PageSize;
                var sortDirection = filter.SortAscending ? "ASC" : "DESC";
                var where = BuildWhereClause(dynamicWhere);

                var sql = $@"
                    SELECT COUNT(*) FROM {_tableName}{where};
                    SELECT * FROM {_tableName}{where} ORDER BY {filter.SortBy} {sortDirection} LIMIT {filter.PageSize} OFFSET {offset}";

                using (var multi = await connection.QueryMultipleAsync(sql, parameters))
                {
                    var totalCount = await multi.ReadFirstAsync<int>();
                    var items = await multi.ReadAsync<T>();

                    return new PagedResult<T>
                    {
                        Items = items.ToList(),
                        PageNumber = filter.PageNumber,
                        PageSize = filter.PageSize,
                        TotalCount = totalCount,
                        TotalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize)
                    };
                }
            }
        }

        public async Task<IEnumerable<TResult>> QueryWithJoinAsync<TJoin, TResult>(
            string sql,
            Func<T, TJoin, TResult> map,
            object parameters = null,
            string splitOn = "Id")
        {
            using (var connection = CreateConnection())
            {
                return await connection.QueryAsync(sql, map, parameters, splitOn: splitOn);
            }
        }

        public async Task<IEnumerable<TResult>> QueryWithTwoJoinsAsync<TJoin1, TJoin2, TResult>(
            string sql,
            Func<T, TJoin1, TJoin2, TResult> map,
            object parameters = null,
            string splitOn = "Id,Id")
        {
            using (var connection = CreateConnection())
            {
                return await connection.QueryAsync(sql, map, parameters, splitOn: splitOn);
            }
        }

        public async Task<IEnumerable<TResult>> QueryWithThreeJoinsAsync<TJoin1, TJoin2, TJoin3, TResult>(
            string sql,
            Func<T, TJoin1, TJoin2, TJoin3, TResult> map,
            object parameters = null,
            string splitOn = "Id,Id,Id")
        {
            using (var connection = CreateConnection())
            {
                return await connection.QueryAsync(sql, map, parameters, splitOn: splitOn);
            }
        }

        public async Task<SqlMapper.GridReader> QueryMultipleAsync(string sql, object parameters = null)
        {
            var connection = CreateConnection();
            return await connection.QueryMultipleAsync(sql, parameters);
        }

        public async Task<int> AddRangeAsync(IEnumerable<T> entities)
        {
            var entityList = entities.ToList();
            if (!entityList.Any())
            {
                return 0;
            }

            using (var connection = CreateConnection())
            {
                var sql = GenerateBulkInsertQuery(entityList.Count);
                var parameters = CreateBulkParameters(entityList);
                return await connection.ExecuteAsync(sql, parameters);
            }
        }

        public async Task<int> UpdateRangeAsync(IEnumerable<T> entities)
        {
            var entityList = entities.ToList();
            if (!entityList.Any())
            {
                return 0;
            }

            using (var connection = CreateConnection())
            {
                var sql = GenerateUpdateQuery();
                return await connection.ExecuteAsync(sql, entityList);
            }
        }

        public async Task<int> DeleteRangeAsync(IEnumerable<int> ids)
        {
            var idList = ids.ToList();
            if (!idList.Any())
            {
                return 0;
            }

            using (var connection = CreateConnection())
            {
                var sql = $"DELETE FROM {_tableName} WHERE Id IN @Ids";
                return await connection.ExecuteAsync(sql, new { Ids = idList });
            }
        }

        public async Task<int> SoftDeleteRangeAsync(IEnumerable<int> ids)
        {
            var idList = ids.ToList();
            if (!idList.Any())
            {
                return 0;
            }

            using (var connection = CreateConnection())
            {
                var sql = $"UPDATE {_tableName} SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP() WHERE Id IN @Ids";
                return await connection.ExecuteAsync(sql, new { Ids = idList });
            }
        }

        public async Task<TResult> ExecuteTransactionAsync<TResult>(Func<IDbConnection, IDbTransaction, Task<TResult>> operation)
        {
            using (var connection = CreateConnection())
            {
                connection.Open();

                using (var transaction = connection.BeginTransaction())
                {
                    try
                    {
                        var result = await operation(connection, transaction);
                        transaction.Commit();
                        return result;
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        public async Task ExecuteTransactionAsync(Func<IDbConnection, IDbTransaction, Task> operation)
        {
            using (var connection = CreateConnection())
            {
                connection.Open();

                using (var transaction = connection.BeginTransaction())
                {
                    try
                    {
                        await operation(connection, transaction);
                        transaction.Commit();
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }
    }
}