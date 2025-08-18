-- 考核系统多类别支持 - 数据库结构升级

-- 1. 创建考核类别表
CREATE TABLE IF NOT EXISTS exam_categories (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '类别ID',
    name VARCHAR(100) NOT NULL COMMENT '类别名称',
    description TEXT COMMENT '类别描述',
    icon VARCHAR(50) DEFAULT 'BookOpen' COMMENT '图标名称',
    color VARCHAR(20) DEFAULT '#3b82f6' COMMENT '主题色',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY unique_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考核类别表';

-- 2. 为 question_sets 表添加类别字段
ALTER TABLE question_sets 
ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL COMMENT '所属考核类别ID',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
ADD INDEX idx_category_id (category_id);

-- 3. 为 training_records 表添加类别字段  
ALTER TABLE training_records
ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL COMMENT '考核类别ID',
ADD INDEX idx_category_id (category_id);

-- 4. 插入默认考核类别
INSERT IGNORE INTO exam_categories (id, name, description, icon, color, sort_order) VALUES
(1, '新员工培训考核', '针对新入职员工的基础培训考核，涵盖公司文化、产品知识、业务流程等内容', 'GraduationCap', '#10b981', 1),
(2, '公司业务考核', '针对在职员工的业务能力考核，包括销售技巧、客户服务、专业知识等', 'Building2', '#3b82f6', 2),
(3, '技能认证考核', '针对特定岗位或技能的专业认证考核', 'Award', '#8b5cf6', 3),
(4, '安全培训考核', '工作安全、信息安全等相关培训考核', 'Shield', '#ef4444', 4),
(5, '合规培训考核', '法律法规、公司制度等合规性培训考核', 'Scale', '#f59e0b', 5);

-- 5. 将现有题库分配到默认类别（新员工培训考核）
UPDATE question_sets 
SET category_id = 1 
WHERE category_id IS NULL;

-- 6. 更新现有考试记录的类别信息
UPDATE training_records tr
JOIN question_sets qs ON tr.set_id = qs.id
SET tr.category_id = qs.category_id
WHERE tr.category_id IS NULL;

-- 7. 添加外键约束
ALTER TABLE question_sets 
ADD CONSTRAINT fk_question_sets_category 
FOREIGN KEY (category_id) REFERENCES exam_categories(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE training_records 
ADD CONSTRAINT fk_training_records_category 
FOREIGN KEY (category_id) REFERENCES exam_categories(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. 创建题库统计视图
CREATE OR REPLACE VIEW exam_category_stats AS
SELECT 
    ec.id,
    ec.name,
    ec.description,
    ec.icon,
    ec.color,
    ec.sort_order,
    ec.is_active,
    COUNT(DISTINCT qs.id) as question_sets_count,
    COALESCE(SUM(qs.total_questions), 0) as total_questions,
    COUNT(DISTINCT tr.id) as exam_records_count,
    ROUND(AVG(tr.score), 1) as avg_score
FROM exam_categories ec
LEFT JOIN question_sets qs ON ec.id = qs.category_id AND qs.is_active = TRUE
LEFT JOIN training_records tr ON ec.id = tr.category_id
WHERE ec.is_active = TRUE
GROUP BY ec.id, ec.name, ec.description, ec.icon, ec.color, ec.sort_order, ec.is_active
ORDER BY ec.sort_order ASC;