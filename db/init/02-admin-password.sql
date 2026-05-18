UPDATE users
SET password_hash = '$2a$10$dIAVKL9d99vPW.83xJgfHOInAf0nuY1CnrEssjDUpkTUHwLBlFNjy',
    is_active = TRUE
WHERE iin = '000000000001';
