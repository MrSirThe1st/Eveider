-- Activate OPERATOR as a first-class DB role (ops staff scaffold).
-- No dedicated UI yet — assign only via SQL / admin tooling until product flows exist.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'operator';
