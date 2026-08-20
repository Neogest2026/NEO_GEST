SELECT * FROM neogest.Empleado;

-- Password demo: admin123
-- Siempre insertar hashes bcrypt en password_hash; nunca texto plano.
INSERT INTO neogest.Usuario (`email`, `password_hash`, `Rol_idRol`, `estado`) 
VALUES ('juan.perez@neogest.com', '$2b$12$xfZiWffhMtieBoF1rQDDuudi2iPj5cTYmoImvJd/7MyTg1k/eQMqW', 1, 1);
INSERT INTO neogest.Empleado (nombre_empleado, cargo, Usuario_idUsuario) 
VALUES ('JUAN PEREZ', 'INGENIERO MECANICO', 1);
SELECT * FROM neogest.Usuario;
SELECT * FROM neogest.Empleado;
DELETE FROM `neogest`.`Empleado` WHERE `idEmpleado` = 1;
DELETE FROM `neogest`.`Usuario` WHERE `idUsuario` = 1;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `neogest`.`Empleado`;
TRUNCATE TABLE `neogest`.`Usuario`;
TRUNCATE TABLE `neogest`.`Cliente`; -- Opcional, si insertaste alguno

SET FOREIGN_KEY_CHECKS = 1;
