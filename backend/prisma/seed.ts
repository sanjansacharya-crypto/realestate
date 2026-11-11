import { PrismaClient, Role, OrganizationType, MembershipStatus, ProjectStatus, ProjectType, AreaUnit } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_SALT_ROUNDS = 12;

const DEFAULT_PASSWORD = 'Password@123';

async function main() {
  console.log('🌱 Starting database seeding for Real Estate Platform...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_SALT_ROUNDS);

  // -------------------------------------------------------------------------
  // 1. Organizations
  // -------------------------------------------------------------------------
  console.log('🏢 Seeding Organizations...');

  const developerOrg = await prisma.organization.upsert({
    where: { slug: 'apex-realty' },
    update: {},
    create: {
      name: 'Apex Realty Developers',
      slug: 'apex-realty',
      type: OrganizationType.DEVELOPER,
      isActive: true,
    },
  });

  const contractorOrg = await prisma.organization.upsert({
    where: { slug: 'buildwell-infra' },
    update: {},
    create: {
      name: 'BuildWell Infrastructure',
      slug: 'buildwell-infra',
      type: OrganizationType.CONTRACTOR,
      isActive: true,
    },
  });

  const vendorOrg = await prisma.organization.upsert({
    where: { slug: 'steelcraft-supplies' },
    update: {},
    create: {
      name: 'SteelCraft Supplies',
      slug: 'steelcraft-supplies',
      type: OrganizationType.VENDOR,
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 2. Users & Memberships for each interface
  // -------------------------------------------------------------------------
  console.log('👥 Seeding Users and Role Memberships...');

  // 2.1 Platform Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@platform.com' },
    update: { passwordHash, isSuperAdmin: true },
    create: {
      email: 'admin@platform.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Admin',
      phoneNumber: '+919876543210',
      isSuperAdmin: true,
      isActive: true,
    },
  });

  // 2.2 Developer / Seller
  const devUser = await prisma.user.upsert({
    where: { email: 'developer@apexrealty.com' },
    update: { passwordHash },
    create: {
      email: 'developer@apexrealty.com',
      passwordHash,
      firstName: 'Devendra',
      lastName: 'Sharma',
      phoneNumber: '+919876543211',
      isSuperAdmin: false,
      isActive: true,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: devUser.id,
        organizationId: developerOrg.id,
      },
    },
    update: { role: Role.DEVELOPER, status: MembershipStatus.ACTIVE, isDefault: true },
    create: {
      userId: devUser.id,
      organizationId: developerOrg.id,
      role: Role.DEVELOPER,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
    },
  });

  // 2.3 Contractor
  const contractorUser = await prisma.user.upsert({
    where: { email: 'contractor@buildwell.com' },
    update: { passwordHash },
    create: {
      email: 'contractor@buildwell.com',
      passwordHash,
      firstName: 'Connor',
      lastName: 'Roy',
      phoneNumber: '+919876543212',
      isSuperAdmin: false,
      isActive: true,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: contractorUser.id,
        organizationId: contractorOrg.id,
      },
    },
    update: { role: Role.CONTRACTOR, status: MembershipStatus.ACTIVE, isDefault: true },
    create: {
      userId: contractorUser.id,
      organizationId: contractorOrg.id,
      role: Role.CONTRACTOR,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
    },
  });

  // 2.4 Vendor
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@steelcraft.com' },
    update: { passwordHash },
    create: {
      email: 'vendor@steelcraft.com',
      passwordHash,
      firstName: 'Victor',
      lastName: 'Verma',
      phoneNumber: '+919876543213',
      isSuperAdmin: false,
      isActive: true,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: vendorUser.id,
        organizationId: vendorOrg.id,
      },
    },
    update: { role: Role.VENDOR, status: MembershipStatus.ACTIVE, isDefault: true },
    create: {
      userId: vendorUser.id,
      organizationId: vendorOrg.id,
      role: Role.VENDOR,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
    },
  });

  // 2.5 Buyer
  const buyerUser = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: { passwordHash },
    create: {
      email: 'buyer@example.com',
      passwordHash,
      firstName: 'Bhavna',
      lastName: 'Patel',
      phoneNumber: '+919876543214',
      isSuperAdmin: false,
      isActive: true,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: buyerUser.id,
        organizationId: developerOrg.id,
      },
    },
    update: { role: Role.BUYER, status: MembershipStatus.ACTIVE, isDefault: true },
    create: {
      userId: buyerUser.id,
      organizationId: developerOrg.id,
      role: Role.BUYER,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
    },
  });

  // 2.6 Employee
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@buildwell.com' },
    update: { passwordHash },
    create: {
      email: 'employee@buildwell.com',
      passwordHash,
      firstName: 'Ethan',
      lastName: 'Nair',
      phoneNumber: '+919876543215',
      isSuperAdmin: false,
      isActive: true,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: employeeUser.id,
        organizationId: contractorOrg.id,
      },
    },
    update: { role: Role.EMPLOYEE, status: MembershipStatus.ACTIVE, isDefault: true },
    create: {
      userId: employeeUser.id,
      organizationId: contractorOrg.id,
      role: Role.EMPLOYEE,
      status: MembershipStatus.ACTIVE,
      isDefault: true,
    },
  });

  // -------------------------------------------------------------------------
  // 3. Sample Project for Developer
  // -------------------------------------------------------------------------
  console.log('🏗️ Seeding Sample Project...');

  const sampleProject = await prisma.project.upsert({
    where: {
      organizationId_code: {
        organizationId: developerOrg.id,
        code: 'GFM-01',
      },
    },
    update: {},
    create: {
      organizationId: developerOrg.id,
      createdById: devUser.id,
      name: 'Greenfield Meadows Phase 1',
      code: 'GFM-01',
      description: 'Premium gated plotted layout with avenue trees, underground utilities, and luxury clubhouse.',
      projectType: ProjectType.PLOTTED_DEVELOPMENT,
      status: ProjectStatus.ACTIVE,
      reraNumber: 'PRM/KA/RERA/1251/310/PR/240101/006543',
      address: 'Near Sarjapur Tech Corridor',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '562125',
      country: 'India',
      totalArea: 25.5,
      areaUnit: AreaUnit.ACRES,
      expectedStartDate: new Date('2026-01-15T00:00:00.000Z'),
      expectedCompletionDate: new Date('2027-12-31T00:00:00.000Z'),
      isActive: true,
    },
  });

  // -------------------------------------------------------------------------
  // 4. Sample Project Assignments (Phase 7)
  // -------------------------------------------------------------------------
  console.log('🤝 Seeding Project Assignments...');

  await prisma.projectOrganizationAssignment.upsert({
    where: {
      projectId_organizationId: {
        projectId: sampleProject.id,
        organizationId: contractorOrg.id,
      },
    },
    update: {},
    create: {
      projectId: sampleProject.id,
      organizationId: contractorOrg.id,
      assignedById: devUser.id,
      assignmentType: 'CONTRACTOR',
      status: 'ACTIVE',
      scopeOfWork: 'Internal layout asphalt roads, storm water drainage, and perimeter fencing.',
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
    },
  });

  await prisma.projectOrganizationAssignment.upsert({
    where: {
      projectId_organizationId: {
        projectId: sampleProject.id,
        organizationId: vendorOrg.id,
      },
    },
    update: {},
    create: {
      projectId: sampleProject.id,
      organizationId: vendorOrg.id,
      assignedById: devUser.id,
      assignmentType: 'VENDOR',
      status: 'ACTIVE',
      scopeOfWork: 'Bulk supply of 53-grade OPC cement, 500D TMT steel bars, and paving blocks.',
    },
  });

  // Assign Employee Ethan Nair as Site Engineer
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: sampleProject.id,
        userId: employeeUser.id,
      },
    },
    update: {},
    create: {
      projectId: sampleProject.id,
      userId: employeeUser.id,
      organizationId: contractorOrg.id,
      assignedById: contractorUser.id,
      role: 'SITE_ENGINEER',
      status: 'ACTIVE',
    },
  });

  // -------------------------------------------------------------------------
  // 5. Sample Plots (Phase 8 Inventory)
  // -------------------------------------------------------------------------
  console.log('📐 Seeding Plot Inventory for GFM-01...');

  const samplePlots = [
    {
      plotNumber: 'P-101',
      plotType: 'CORNER' as const,
      status: 'AVAILABLE' as const,
      area: 2400,
      areaUnit: AreaUnit.SQ_FT,
      length: 60,
      width: 40,
      facing: 'EAST' as const,
      block: 'Block-A',
      sector: 'Sector-1',
      basePricePerUnit: 2000,
      totalPrice: 4800000,
      isCornerPlot: true,
      isParkFacing: false,
      premiumCharges: 100000,
      description: 'East-facing corner residential plot with double road access.',
    },
    {
      plotNumber: 'P-102',
      plotType: 'PARK_FACING' as const,
      status: 'AVAILABLE' as const,
      area: 1500,
      areaUnit: AreaUnit.SQ_FT,
      length: 50,
      width: 30,
      facing: 'NORTH' as const,
      block: 'Block-A',
      sector: 'Sector-1',
      basePricePerUnit: 2000,
      totalPrice: 3000000,
      isCornerPlot: false,
      isParkFacing: true,
      premiumCharges: 50000,
      description: 'North-facing plot overlooking the children park and jogging track.',
    },
    {
      plotNumber: 'P-103',
      plotType: 'RESIDENTIAL' as const,
      status: 'TEMPORARILY_RESERVED' as const,
      area: 1200,
      areaUnit: AreaUnit.SQ_FT,
      length: 40,
      width: 30,
      facing: 'WEST' as const,
      block: 'Block-A',
      sector: 'Sector-1',
      basePricePerUnit: 2000,
      totalPrice: 2400000,
      isCornerPlot: false,
      isParkFacing: false,
      premiumCharges: 0,
      description: 'Standard residential plot, currently on 48-hour enquiry hold.',
    },
    {
      plotNumber: 'P-104',
      plotType: 'VILLA_PLOT' as const,
      status: 'BOOKED' as const,
      area: 2400,
      areaUnit: AreaUnit.SQ_FT,
      length: 60,
      width: 40,
      facing: 'EAST' as const,
      block: 'Block-B',
      sector: 'Sector-2',
      basePricePerUnit: 2100,
      totalPrice: 5040000,
      isCornerPlot: false,
      isParkFacing: true,
      premiumCharges: 75000,
      description: 'Premium villa plot booked with initial token deposit paid.',
    },
    {
      plotNumber: 'P-105',
      plotType: 'RESIDENTIAL' as const,
      status: 'SOLD' as const,
      area: 1200,
      areaUnit: AreaUnit.SQ_FT,
      length: 40,
      width: 30,
      facing: 'SOUTH' as const,
      block: 'Block-B',
      sector: 'Sector-2',
      basePricePerUnit: 2000,
      totalPrice: 2400000,
      isCornerPlot: false,
      isParkFacing: false,
      premiumCharges: 0,
      description: 'Sale deed executed and handed over to owner.',
    },
    {
      plotNumber: 'P-106',
      plotType: 'COMMERCIAL' as const,
      status: 'BLOCKED' as const,
      area: 3200,
      areaUnit: AreaUnit.SQ_FT,
      length: 80,
      width: 40,
      facing: 'NORTH_EAST' as const,
      block: 'Block-C',
      sector: 'Commercial Plaza',
      basePricePerUnit: 2500,
      totalPrice: 8000000,
      isCornerPlot: true,
      isParkFacing: false,
      premiumCharges: 250000,
      description: 'Commercial retail plot reserved for convenience supermarket.',
    },
  ];

  for (const plotData of samplePlots) {
    await prisma.plot.upsert({
      where: {
        projectId_plotNumber: {
          projectId: sampleProject.id,
          plotNumber: plotData.plotNumber,
        },
      },
      update: {},
      create: {
        projectId: sampleProject.id,
        plotNumber: plotData.plotNumber,
        plotType: plotData.plotType,
        status: plotData.status,
        area: plotData.area,
        areaUnit: plotData.areaUnit,
        length: plotData.length,
        width: plotData.width,
        facing: plotData.facing,
        block: plotData.block,
        sector: plotData.sector,
        basePricePerUnit: plotData.basePricePerUnit,
        totalPrice: plotData.totalPrice,
        currency: 'INR',
        isCornerPlot: plotData.isCornerPlot,
        isParkFacing: plotData.isParkFacing,
        premiumCharges: plotData.premiumCharges,
        description: plotData.description,
      },
    });
  }

  console.log('✅ Seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEVELOPER LOGIN CREDENTIALS FOR EACH INTERFACE:');
  console.log('Password for all accounts: ' + DEFAULT_PASSWORD);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.table([
    { Interface: 'Platform Admin', Email: adminUser.email, Role: 'SUPERADMIN', Organization: 'Global Platform' },
    { Interface: 'Seller / Developer', Email: devUser.email, Role: 'DEVELOPER', Organization: developerOrg.name },
    { Interface: 'Contractor', Email: contractorUser.email, Role: 'CONTRACTOR', Organization: contractorOrg.name },
    { Interface: 'Vendor', Email: vendorUser.email, Role: 'VENDOR', Organization: vendorOrg.name },
    { Interface: 'Buyer', Email: buyerUser.email, Role: 'BUYER', Organization: developerOrg.name },
    { Interface: 'Employee', Email: employeeUser.email, Role: 'EMPLOYEE', Organization: contractorOrg.name },
  ]);
  console.log('Sample Project seeded: ' + sampleProject.name + ' (' + sampleProject.code + ')');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

