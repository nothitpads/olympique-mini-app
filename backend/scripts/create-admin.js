const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const readline = require('readline')

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function createAdmin() {
  try {
    console.log('=== Create Admin User ===\n')

    const email = await question('Email: ')
    const password = await question('Password (min 8 chars): ')
    const firstName = await question('First Name (optional): ')
    const lastName = await question('Last Name (optional): ')

    if (!email || !password) {
      console.error('Error: Email and password are required')
      process.exit(1)
    }

    if (password.length < 8) {
      console.error('Error: Password must be at least 8 characters')
      process.exit(1)
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existing) {
      console.error('Error: User with this email already exists')
      process.exit(1)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        first_name: firstName || null,
        last_name: lastName || null,
        role: 'admin'
      }
    })

    console.log('\n✅ Admin user created successfully!')
    console.log(`ID: ${admin.id}`)
    console.log(`Email: ${admin.email}`)
    console.log(`Role: ${admin.role}`)
    console.log('\nYou can now login to the admin panel.')

  } catch (error) {
    console.error('Error creating admin:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    rl.close()
  }
}

createAdmin()

