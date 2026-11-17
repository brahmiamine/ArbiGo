START TRANSACTION;
INSERT INTO monitor.projects (name,url,repo_url,container,repo_dir,description,created)
SELECT 'ArbiGo','https://arbigo.clubika.com','https://github.com/brahmiamine/ArbiGo','arbigo-web','ArbiGo','Carnet de préparation des arbitres — PWA Next.js et MariaDB partagé',UNIX_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM monitor.projects WHERE repo_dir='ArbiGo');
INSERT INTO monitor.monitors(name,kind,target,keyword,expected,group_name,created)
SELECT 'ArbiGo — API et base MariaDB','keyword','https://arbigo.clubika.com/api/health','"status":"ok"','200-299','Applications',UNIX_TIMESTAMP()
WHERE NOT EXISTS(SELECT 1 FROM monitor.monitors WHERE target='https://arbigo.clubika.com/api/health');
INSERT INTO monitor.monitors(name,kind,target,group_name,created)
SELECT 'ArbiGo — application','docker','arbigo-web','Conteneurs',UNIX_TIMESTAMP()
WHERE NOT EXISTS(SELECT 1 FROM monitor.monitors WHERE kind='docker' AND target='arbigo-web');
INSERT INTO monitor.monitors(name,kind,target,group_name,created)
SELECT 'ArbiGo — worker Push','docker','arbigo-worker','Conteneurs',UNIX_TIMESTAMP()
WHERE NOT EXISTS(SELECT 1 FROM monitor.monitors WHERE kind='docker' AND target='arbigo-worker');
INSERT IGNORE INTO monitor.project_monitors(project_id,monitor_id)
SELECT p.id,m.id FROM monitor.projects p CROSS JOIN monitor.monitors m WHERE p.repo_dir='ArbiGo' AND m.target IN('https://arbigo.clubika.com/api/health','arbigo-web','arbigo-worker');
COMMIT;
