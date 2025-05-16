import { User } from './users/schemas/user.schema';
import { UsersService } from './users/users.service';
import * as bcrypt from 'bcrypt';

export async function seedRootUser(usersService: UsersService) {
  const rootEmail = 'root@terraform.com';
  const plainPassword = 'rootpassword'; // cámbialo luego por seguridad
  const hashedPassword = await bcrypt.hash(plainPassword, 10);


  const existing = await usersService.findByEmail(rootEmail);

  if (existing) {
    console.log('[Seeder] Usuario root ya existe');
    return;
  }

  const rootUserData: Partial<User> = {
    // Asegúrate que User aquí coincida con tu schema
    nombre: 'Root Admin',
    email: rootEmail,
    passwordHash: hashedPassword, // <--- USA passwordHash
    systemRoles: ['ROOT', 'USER'],
    isActive: true,
    // ... otras propiedades
  };
  
  await usersService.create(rootUserData);

  console.log('[Seeder] Usuario root creado con éxito');
}
