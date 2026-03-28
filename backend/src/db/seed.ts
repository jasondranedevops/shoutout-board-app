import { prisma } from '@/db/client'
import bcrypt from 'bcryptjs'

async function seed() {
  try {
    // Clear existing data in dependency order
    await prisma.webhookDelivery.deleteMany()
    await prisma.webhookSubscription.deleteMany()
    await prisma.boardView.deleteMany()
    await prisma.post.deleteMany()
    await prisma.board.deleteMany()
    await prisma.apiKey.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()

    // Create demo organization
    const org = await prisma.organization.create({
      data: {
        name: 'Demo Corp',
        slug: 'demo-corp',
        plan: 'STARTER',
      },
    })

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('demo1234', 10)
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@demo.shoutboard.io',
        name: 'Demo Admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        orgId: org.id,
      },
    })

    // Create a sample board
    const board = await prisma.board.create({
      data: {
        title: 'Happy Birthday Sarah!',
        slug: 'happy-birthday-sarah-abc123',
        occasionType: 'BIRTHDAY',
        status: 'ACTIVE',
        recipientName: 'Sarah Johnson',
        recipientEmail: 'sarah@example.com',
        coverTheme: 'indigo',
        orgId: org.id,
        creatorId: adminUser.id,
      },
    })

    // Add sample posts
    await prisma.post.create({
      data: {
        boardId: board.id,
        authorName: 'John Smith',
        authorId: adminUser.id,
        contentText: 'Happy birthday Sarah! Wishing you an amazing year ahead!',
        isAnonymous: false,
      },
    })

    await prisma.post.create({
      data: {
        boardId: board.id,
        authorName: 'Anonymous',
        contentText: 'Have a fantastic day celebrating you!',
        isAnonymous: true,
      },
    })

    await prisma.post.create({
      data: {
        boardId: board.id,
        authorName: 'Emma Davis',
        contentText: 'Cheers to another year of success and happiness! 🎉',
        isAnonymous: false,
      },
    })

    console.log('Seed completed successfully!')
    console.log(`Created organization: ${org.name} (${org.id})`)
    console.log(`Created admin user: ${adminUser.email}`)
    console.log(`Created sample board: ${board.title}`)
    console.log('Sample login credentials:')
    console.log('  Email: admin@demo.shoutboard.io')
    console.log('  Password: demo1234')
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
