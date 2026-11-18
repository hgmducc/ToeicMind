using ToeicMind.DTOs.Exams.Response;

namespace ToeicMind.Services.Learning;

/// <summary>Duyệt cây phân loại câu hỏi (QuestionCategory) trong bộ nhớ, dùng chung cho thẻ ngân hàng, ngữ pháp và nghe chép.</summary>
public static class CategoryTree
{
    /// <summary>Tra cứu các nút con theo ID nút cha.</summary>
    public static ILookup<int, CategoryCatalogDto> ChildrenOf(IEnumerable<CategoryCatalogDto> categories) =>
        categories.Where(c => c.ParentCategoryId != null).ToLookup(c => c.ParentCategoryId!.Value);

    /// <summary>Nút và mọi nút con của nó.</summary>
    public static HashSet<int> Subtree(int rootId, ILookup<int, CategoryCatalogDto> children)
    {
        var ids = new HashSet<int> { rootId };
        var queue = new Queue<int>([rootId]);
        while (queue.Count > 0)
            foreach (var child in children[queue.Dequeue()])
                if (ids.Add(child.CategoryId)) queue.Enqueue(child.CategoryId);
        return ids;
    }
}
