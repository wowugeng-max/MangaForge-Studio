-- Clean duplicate chapters (keep the one with lowest id per project_id + chapter_no combination)
DELETE FROM chapters WHERE id NOT IN (
  SELECT MIN(id) FROM chapters GROUP BY project_id, chapter_no
);

-- Clean duplicate outlines (keep the one with lowest id per project_id + title combination)
DELETE FROM outlines WHERE id NOT IN (
  SELECT MIN(id) FROM outlines GROUP BY project_id, title
);

-- Clean duplicate worldbuilding entries (keep the one with lowest id per project_id)
DELETE FROM worldbuilding WHERE id NOT IN (
  SELECT MIN(id) FROM worldbuilding GROUP BY project_id
);

-- Clean duplicate characters (keep the one with lowest id per project_id + name combination)
DELETE FROM characters WHERE id NOT IN (
  SELECT MIN(id) FROM characters GROUP BY project_id, name
);
