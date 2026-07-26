import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, Between, Like, MoreThanOrEqual, In, Not } from 'typeorm';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as fs from 'fs';
import * as path from 'path';
import { MailerService } from '@nestjs-modules/mailer';
import { GetDashboardDto } from './dto/get-dashboard.dto';
import { Image } from 'src/batch/entities/image.entity';
import { Detection } from 'src/prediction/entities/detection.entity';
import { Batch } from 'src/batch/entities/batch.entity';
import { GetProfileDto } from './dto/get-profile.dto';
import { NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';


@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Batch) private batchRepository: Repository<Batch>,
    @InjectRepository(Image) private imageRepository: Repository<Image>,
    @InjectRepository(Detection) private detectionRepository: Repository<Detection>,
    private readonly mailerService: MailerService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(userData);
    return this.userRepository.save(newUser);
  }

  async findAllUsers(
    currentAdminId: number,
    roleFilter?: string, 
    searchEmail?: string, 
    statusFilter?: string,
    page: number = 1,
    limit: number = 10,
  ) {

    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 10;
    const skip = (currentPage - 1) * perPage;

    const whereCondition: any = {
      is_verified: 1,
      user_id: Not(currentAdminId),
    };

    if (roleFilter) {
      whereCondition.role = roleFilter;
    }

    if (searchEmail) {
      whereCondition.email = Like(`%${searchEmail}%`);
    }

    if (statusFilter === 'active') {
      whereCondition.is_active = true;
    } else if (statusFilter === 'suspend') {
      whereCondition.is_active = false;
    }

    const [[users, filteredTotalCount], totalCount, activeCount, suspendedCount] = await Promise.all([
      this.userRepository.findAndCount({
        where: whereCondition,
        select: [
          'user_id',
          'first_name',
          'last_name',
          'email',
          'profile_image',
          'veterinary_license',
          'role',
          'is_verified',
          'created_at',
          'verified_at',
          'is_active',
        ],
        order: { created_at: 'DESC' },
        skip: skip,
        take: perPage,
      }),

      this.userRepository.count({
        where: { is_verified: 1 },
      }),

      this.userRepository.count({
        where: { is_verified: 1, is_active: true },
      }),

      this.userRepository.count({
        where: { is_verified: 1, is_active: false },
      }),
    ]);

    return {
      summary: {
        total_users: totalCount,
        active_accounts: activeCount,
        suspended: suspendedCount,
      },
      meta: {
        total_items: filteredTotalCount,
        current_page: currentPage,
        per_page: perPage,
        total_pages: Math.ceil(filteredTotalCount / perPage),
      },
      data: users,
    };
  }

  async updateRole(id: number, updateRoleDto: UpdateRoleDto) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    user.role = updateRoleDto.role;
    await this.userRepository.save(user);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Account Role Updated - Avian Blood System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; color: #333333;">
            <h2 style="color: #1976d2; margin-top: 0;">Account Role Updated 🛡️</h2>
            
            <p>Dear <b>Dr. ${user.first_name} ${user.last_name}</b>,</p>
            
            <p>We would like to inform you that your account role within the <b>Avian Blood System</b> has been updated by an administrator.</p>
            
            <!-- กล่องแสดง Role ใหม่สีน้ำเงิน -->
            <div style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #1976d2; margin: 20px 0; border-radius: 4px;">
              <b style="color: #1976d2; font-size: 14px; text-transform: uppercase;">New Assigned Role:</b>
              <p style="margin: 8px 0 0 0; color: #444444; line-height: 1.5; font-size: 15px; font-weight: bold;">${user.role}</p>
            </div>

            <p>You can now log in to your account to access features and permissions corresponding to your new role.</p>
            
            <br>
            <p style="margin-bottom: 0;">Best regards,</p>
            <b style="color: #555555;">Avian Blood System Team</b>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0 15px 0;">
            <small style="color: #888888; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</small>
          </div>
        `,
      });
    } catch (err) {
      console.log('Error sending email:', err);
    }

    return {
      message: `${user.first_name} role has been updated to ${user.role} and a notification email has been sent successfully.`,
    };
  }

  async suspendUser(id: number, adminId: number, reason?: string) {
    if (id === adminId) {
      throw new BadRequestException('You cannot suspend your own account.');
    }

    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User to suspend not found.');
    }

    if (user.is_active === false) {
      throw new BadRequestException('This account has already been suspended.');
    }

    // ทำการระงับบัญชีโดยเปลี่ยนสถานะเป็น false
    user.is_active = false;
    await this.userRepository.save(user);

    const suspendReason =
      reason?.trim() ||
      'Violation of system terms of service or suspicious activity detected.';

      try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Account Suspended - Avian Blood System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; color: #333333;">
            <h2 style="color: #c62828; margin-top: 0;">Account Access Suspended ⚠️</h2>
            
            <p>Dear <b>Dr. ${user.first_name} ${user.last_name}</b>,</p>
            
            <p>We are writing to inform you that your access to the <b>Avian Blood System</b> has been temporarily suspended by an administrator.</p>
            
            <p>During this suspension period, you will not be able to log in to your account or perform any blood smear analysis jobs.</p>
            
            <!-- กล่องแสดงเหตุผลสีแดงเข้ม -->
            <div style="background-color: #ffebee; padding: 15px; border-left: 4px solid #c62828; margin: 20px 0; border-radius: 4px;">
              <b style="color: #c62828; font-size: 14px; text-transform: uppercase;">Reason for Suspension:</b>
              <p style="margin: 8px 0 0 0; color: #444444; line-height: 1.5; font-size: 15px;">${suspendReason}</p>
            </div>

            <p>If you believe this suspension was made in error, or if you would like to appeal and request account reinstatement, please contact our system administrator directly.</p>
            
            <br>
            <p style="margin-bottom: 0;">Best regards,</p>
            <b style="color: #555555;">Avian Blood System Team</b>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0 15px 0;">
            <small style="color: #888888; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</small>
          </div>
        `,
      });
    } catch (err) {
      console.log('Error sending email:', err);
    }

    return {
      message: `${user.first_name} ${user.last_name} account has been suspended and a notification email has been sent successfully.`,
    };
  }

  async approveUser(id: number) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User to approve not found.');
    }

    if (user.is_verified === 1) {
      throw new BadRequestException('This account has already been approved.');
    }

    user.is_verified = 1;
    user.is_active = true;
    user.verified_at = new Date();
    await this.userRepository.save(user);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Account Approved - Avian Blood System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; color: #333333;">
            <h2 style="color: #2e7d32; margin-top: 0;">Account Successfully Approved 🎉</h2>
            
            <p>Dear <b>Dr. ${user.first_name} ${user.last_name}</b>,</p>
            
            <p>We are pleased to inform you that your veterinary registration and professional license have been successfully verified by our administrative team.</p>
            
            <div style="background-color: #f1f8e9; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0; border-radius: 4px;">
              <b style="color: #2e7d32; font-size: 14px; text-transform: uppercase;">Status: Approved</b>
              <p style="margin: 8px 0 0 0; color: #444444; line-height: 1.5; font-size: 15px;">
                Verified on: ${user.verified_at.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>

            <p>You now have full access to the <b>Avian Blood System</b>. You can log in to your account at any time to start utilizing our automated avian blood smear analysis tools.</p>
            
            <br>
            <p style="margin-bottom: 0;">Best regards,</p>
            <b style="color: #555555;">Avian Blood System Team</b>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0 15px 0;">
            <small style="color: #888888; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</small>
          </div>
        `,
      });
    } catch (err) {
      console.log('เกิดข้อผิดพลาดในการส่งอีเมล:', err);
    }

    return {
      message: `Account ${user.email} has been approved and a notification email has been sent successfully.`,
    };
  }

  async findUnverifiedUsers(
    searchEmail?: string,
    statusFilter: string = 'all',
    page: number = 1,
    limit: number = 10,
  ) {
    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 10;
    const skip = (currentPage - 1) * perPage;

    const whereCondition: any = {};

    if (statusFilter === 'pending') {
      whereCondition.is_verified = 0;
    } else if (statusFilter === 'reject') {
      whereCondition.is_verified = 2;
    } else {
      whereCondition.is_verified = In([0, 2]);
    }

    if (searchEmail) {
      whereCondition.email = Like(`%${searchEmail}%`);
    }

    const [
      [unverifiedUsers, filteredTotalCount],
      pendingCount,
      approvedTotalCount,
      rejectedTotalCount,
    ] = await Promise.all([
      this.userRepository.findAndCount({
        where: whereCondition,
        select: [
          'user_id',
          'first_name',
          'last_name',
          'email',
          'veterinary_license',
          'role',
          'is_verified', 
          'created_at',
        ],
        order: { created_at: 'ASC' },
        skip: skip,
        take: perPage,
      }),

      this.userRepository.count({
        where: { is_verified: 0 },
      }),

      this.userRepository.count({
        where: {
          is_verified: 1,
        },
      }),

      this.userRepository.count({
        where: {
          is_verified: 2,
        },
      }),
    ]);

    let responseMessage = 'Users found.';
    if (unverifiedUsers.length === 0) {
      responseMessage = 'No users found.';
    }

    return {
      message: responseMessage,
      summary: {
        pending: pendingCount,
        approved_total: approvedTotalCount,
        rejected_total: rejectedTotalCount,
      },
      meta: {
        total_items: filteredTotalCount,
        current_page: currentPage,
        per_page: perPage,
        total_pages: Math.ceil(filteredTotalCount / perPage),
      },
      data: unverifiedUsers,
    };
  }

  async rejectUser(id: number, reason?: string) {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new BadRequestException('User to reject not found.');
    }

    if (user.is_verified === 1) {
      throw new BadRequestException(
        'This account has already been approved and cannot be rejected.',
      );
    }

    if (user.is_verified === 2) {
      throw new BadRequestException('This account has already been rejected.');
    }

    user.is_verified = 2;
    await this.userRepository.save(user);

    const rejectReason = reason?.trim() || 'Incomplete or invalid veterinary license and registration information.';

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Account Verification Update - Avian Blood System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; color: #333333;">
            <h2 style="color: #d32f2f; margin-top: 0;">Account Verification Notice</h2>
            
            <p>Dear <b>Dr. ${user.first_name} ${user.last_name}</b>,</p>
            
            <p>Thank you for registering with the <b>Avian Blood System</b>. Our administrative team has carefully reviewed your registration details and veterinary license.</p>
            
            <p>We regret to inform you that we are <b>unable to approve your account at this time</b>.</p>
            
            <div style="background-color: #fff5f5; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0; border-radius: 4px;">
              <b style="color: #d32f2f; font-size: 14px; text-transform: uppercase;">Reason for Rejection:</b>
              <p style="margin: 8px 0 0 0; color: #444444; line-height: 1.5; font-size: 15px;">${rejectReason}</p>
            </div>

            <p>If you believe this was a mistake, or if you would like to provide updated documentation for re-evaluation, please contact our system administrator.</p>
            
            <br>
            <p style="margin-bottom: 0;">Best regards,</p>
            <b style="color: #555555;">Avian Blood System Team</b>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0 15px 0;">
            <small style="color: #888888; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</small>
          </div>
        `,
      });
    } catch (err) {
      console.log('เกิดข้อผิดพลาดในการส่งอีเมล:', err);
    }

    return {
      message: `Account ${user.email} has been rejected and a notification email has been sent successfully.`,
    };
  }

  async getDashboardStats(queryDto: GetDashboardDto) {
    const { page = 1, limit = 3 } = queryDto;
    const skip = (page - 1) * limit;

    const [
      total_users,
      pending_verification,
      total_batches,
      completed_batches_raw,
      [pending_users_data, total_pending_items]
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { is_verified: 0 } }),
      this.batchRepository.count(),
      
      this.batchRepository
        .createQueryBuilder('batch')
        .innerJoin('batch.images', 'image')
        .groupBy('batch.batch_id')
        .having("SUM(CASE WHEN image.image_status != 'completed' THEN 1 ELSE 0 END) = 0")
        .getRawMany(),

      this.userRepository.findAndCount({
        where: { is_verified: 0 },
        select: [
          'user_id',
          'first_name',
          'last_name',
          'email',
          'veterinary_license',
          'created_at',
          'is_verified',
        ],
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      })
    ]);

    const completed_batches = completed_batches_raw.length;

    const pending_batches = total_batches - completed_batches;

    const completed_percentage = total_batches > 0
      ? ((completed_batches / total_batches) * 100).toFixed(2)
      : 0;

    const pending_percentage = total_batches > 0 
      ? ((pending_batches / total_batches) * 100).toFixed(2) 
      : 0;

    return {
      total_users,
      pending_verification,
      completed_batches,
      pending_batches,
      pending_users_table: {
        data: pending_users_data,
        meta: {
          total_items: total_pending_items,
          current_page: Number(page),
          per_page: Number(limit),
          total_pages: Math.ceil(total_pending_items / limit),
        }
      },
      prediction_status: {
        completed_percentage: Number(completed_percentage),
        pending_percentage: Number(pending_percentage),
      }
    };
  }

  // profile
  async getMyProfile(userId: number, queryDto: GetProfileDto) {
    const { smear_id, chicken_type, stain_type, startDate, endDate, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      select: ['user_id', 'first_name', 'last_name', 'profile_image', 'email', 'role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const allUserBatches = await this.batchRepository.find({
      where: { user: { user_id: userId } },
      relations: ['images'],
    });

    let absoluteCompletedCount = 0;
    let absolutePendingCount = 0;
    let absoluteSuspendedCount = 0;

    for (const b of allUserBatches) {
      const totalImg = b.images.length;
      const hasSuspendedImg = b.images.some((img) => img.image_status === 'suspended');
      const completedImg = b.images.filter((img) => img.image_status === 'completed').length;

      if (hasSuspendedImg) {
        absoluteSuspendedCount++; 
      } else if (totalImg > 0 && completedImg === totalImg) {
        absoluteCompletedCount++;
      } else {
        absolutePendingCount++;
      }
    }

    const query = this.batchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.images', 'image')
      .leftJoinAndSelect('image.prediction', 'prediction')
      .leftJoinAndSelect('prediction.detections', 'detection')
      .where('batch.user_id = :userId', { userId });

    if (smear_id) {
      query.andWhere('batch.smear_id LIKE :smearId', { smearId: `%${smear_id}%` });
    }
    if (chicken_type) {
      query.andWhere('batch.chicken_type = :chicken_type', { chicken_type });
    }
    if (stain_type) {
      query.andWhere('batch.stain_type = :stain_type', { stain_type });
    }

    query.orderBy('batch.created_at', 'DESC');
    const batches = await query.getMany();

    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    if (startDate && endDate) {
      filterStart = new Date(`${startDate}T00:00:00`);
      filterEnd = new Date(`${endDate}T23:59:59.999`);
    }

    const completed_batches: any[] = [];
    const pending_batches: any[] = [];
    const suspended_batches: any[] = [];

    for (const batch of batches) {
      const totalImages = batch.images.length;
      const hasSuspended = batch.images.some((img) => img.image_status === 'suspended');
      const completedImages = batch.images.filter((img) => img.image_status === 'completed');

      const isCompleted = !hasSuspended && totalImages > 0 && completedImages.length === totalImages;
      const isSuspended = hasSuspended;

      let latestPredictionDate: Date | null = null;
      if (isCompleted) {
        latestPredictionDate = completedImages.reduce((latest, img) => {
          if (!img.prediction) return latest;
          return !latest || img.prediction.predicted_at > latest
            ? img.prediction.predicted_at
            : latest;
        }, null as Date | null);
      }

      if (filterStart && filterEnd) {
        if (isCompleted) {
          if (!latestPredictionDate || latestPredictionDate < filterStart || latestPredictionDate > filterEnd) {
            continue;
          }
        } else {
          if (batch.created_at < filterStart || batch.created_at > filterEnd) {
            continue;
          }
        }
      }

      const batchCellCounts = {
        Heterophil: 0,
        Eosinophil: 0,
        Basophil: 0,
        Lymphocyte: 0,
        Monocyte: 0,
        Thrombocyte: 0,
      };

      const formattedImages = batch.images.map((img) => {
        let predictionData: any = null;

        if (img.prediction) {
          const pred = img.prediction;
          const imgCounts = {
            Heterophil: pred.numOfHeterophils || 0,
            Eosinophil: pred.numOfEosinophils || 0,
            Basophil: pred.numOfBasophils || 0,
            Lymphocyte: pred.numOfLymphocytes || 0,
            Monocyte: pred.numOfMonocytes || 0,
            Thrombocyte: pred.numOfThrombocytes || 0,
          };

          batchCellCounts.Heterophil += imgCounts.Heterophil;
          batchCellCounts.Eosinophil += imgCounts.Eosinophil;
          batchCellCounts.Basophil += imgCounts.Basophil;
          batchCellCounts.Lymphocyte += imgCounts.Lymphocyte;
          batchCellCounts.Monocyte += imgCounts.Monocyte;
          batchCellCounts.Thrombocyte += imgCounts.Thrombocyte;

          const imageTotalCells = Object.values(imgCounts).reduce((a, b) => a + b, 0);
          const imageClasses: Record<string, { count: number; percentage: number }> = {};

          for (const [cellType, count] of Object.entries(imgCounts)) {
            const percentage = imageTotalCells > 0
              ? Number(((count / imageTotalCells) * 100).toFixed(2))
              : 0;

            imageClasses[cellType] = { count, percentage };
          }

          predictionData = {
            ...pred,
            total_cells_detected: imageTotalCells,
            classes: imageClasses,
          };
        }

        return {
          image_id: img.image_id,
          image_name: img.image_name,
          image_status: img.image_status,
          image_path: img.image_path,
          prediction: predictionData,
        };
      });

      const batchTotalCells = Object.values(batchCellCounts).reduce((a, b) => a + b, 0);
      const batchClasses: Record<string, { count: number; percentage: number }> = {};

      for (const [cellType, count] of Object.entries(batchCellCounts)) {
        const percentage = batchTotalCells > 0
          ? Number(((count / batchTotalCells) * 100).toFixed(2))
          : 0;

        batchClasses[cellType] = { count, percentage };
      }

      const formattedBatch = {
        batch_id: batch.batch_id,
        smear_id: batch.smear_id,
        chicken_type: batch.chicken_type,
        province: batch.province,
        age: batch.age,
        stain_type: batch.stain_type,
        description: batch.description,
        status: isSuspended ? 'suspended' : isCompleted ? 'completed' : 'pending',
        created_at: batch.created_at,
        predicted_at: isCompleted ? latestPredictionDate : null,
        owner: {
          first_name: user.first_name,
          last_name: user.last_name,
          profile_image: user.profile_image,
        },
        summary: {
          total_images_in_batch: totalImages,
          total_cells_detected: batchTotalCells,
          classes: batchClasses, 
        },
        images: formattedImages, 
      };

      if (isSuspended) {
        suspended_batches.push(formattedBatch);
      } else if (isCompleted) {
        completed_batches.push(formattedBatch);
      } else {
        pending_batches.push(formattedBatch);
      }
    }

    const totalCompletedFiltered = completed_batches.length;
    const totalPendingFiltered = pending_batches.length;
    const totalSuspendedFiltered = suspended_batches.length;

    const paginatedCompleted = completed_batches.slice(skip, skip + limit);
    const paginatedPending = pending_batches.slice(skip, skip + limit);
    const paginatedSuspended = suspended_batches.slice(skip, skip + limit);

    return {
      message: 'Profile and batch data retrieved successfully',
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
        email: user.email,
        role: user.role,
        total_completed_batches: absoluteCompletedCount,
        total_pending_batches: absolutePendingCount,
        total_suspended_batches: absoluteSuspendedCount, 
      },
      data: {
        completed_batches: {
          items: paginatedCompleted,
          meta: {
            total_items: totalCompletedFiltered,
            current_page: Number(page),
            per_page: Number(limit),
            total_pages: Math.ceil(totalCompletedFiltered / limit),
          },
        },
        pending_batches: {
          items: paginatedPending,
          meta: {
            total_items: totalPendingFiltered,
            current_page: Number(page),
            per_page: Number(limit),
            total_pages: Math.ceil(totalPendingFiltered / limit),
          },
        },
        suspended_batches: { 
          items: paginatedSuspended,
          meta: {
            total_items: totalSuspendedFiltered,
            current_page: Number(page),
            per_page: Number(limit),
            total_pages: Math.ceil(totalSuspendedFiltered / limit),
          },
        },
      },
    };
  }

  async deleteMyBatch(userId: number, batchId: number) {
    // ค้นหาชุดข้อมูลและตรวจสอบว่าเป็นของ User คนนี้จริงๆ
    const batch = await this.batchRepository.findOne({
      where: { 
        batch_id: batchId, 
        user: { user_id: userId } 
      },
      relations: ['images'],
    });

    if (!batch) {
      throw new NotFoundException('Batch not found, or you do not have permission to delete it');
    }

    // ลบไฟล์รูปภาพจริงๆ ออกจากระบบไฟล์ (โฟลเดอร์ uploads)
    if (batch.images && batch.images.length > 0) {
      for (const image of batch.images) {
        if (image.image_path) {
          const filePath = path.join(process.cwd(), image.image_path);
          // ตรวจสอบว่ามีไฟล์อยู่จริงก่อนลบ
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    // ลบชุดข้อมูลออกจากฐานข้อมูล
    await this.batchRepository.remove(batch);

    return {
      message: 'Batch and image files deleted successfully',
    };
  }

  async updateMyProfile(userId: number, updateDto: UpdateProfileDto, file?: Express.Multer.File) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // อัปเดตชื่อและนามสกุลถ้ามีการส่งมา
    if (updateDto.first_name) {
      user.first_name = updateDto.first_name;
    }
    if (updateDto.last_name) {
      user.last_name = updateDto.last_name;
    }

    // จัดการเรื่องรูปภาพโปรไฟล์
    if (file) {
      // 1. ตรวจสอบและลบรูปเก่าทิ้ง (ถ้ามี)
      if (user.profile_image) {
        const oldFilePath = path.join(process.cwd(), user.profile_image);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      // 2. บันทึก path ของรูปใหม่ลง DB (แปลง \ เป็น / สำหรับ Windows)
      user.profile_image = file.path.replace(/\\/g, '/');
    }

    await this.userRepository.save(user);

    return {
      message: 'Profile updated successfully',
      profile: {
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
      },
    };
  }

  async activateUser(targetUserId: number) {
    const user = await this.userRepository.findOne({
      where: { user_id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_active) {
      return {
        message: 'User account is already active',
        data: {
          user_id: user.user_id,
          is_active: user.is_active,
        }
      };
    }

    user.is_active = true; 

    await this.userRepository.save(user);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Account Access Restored - Avian Blood System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; color: #333333;">
            <h2 style="color: #2e7d32; margin-top: 0;">Account Access Restored 🟢</h2>
            
            <p>Dear <b>Dr. ${user.first_name} ${user.last_name}</b>,</p>
            
            <p>We are pleased to inform you that the suspension on your <b>Avian Blood System</b> account has been lifted by an administrator.</p>
            
            <!-- กล่องแสดงสถานะสีเขียว -->
            <div style="background-color: #f1f8e9; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0; border-radius: 4px;">
              <b style="color: #2e7d32; font-size: 14px; text-transform: uppercase;">Current Status: Active</b>
              <p style="margin: 8px 0 0 0; color: #444444; line-height: 1.5; font-size: 15px;">
                Your account privileges and access rights have been fully restored. You can now log in and resume using our blood smear analysis features.
              </p>
            </div>

            <p>Thank you for your cooperation. If you have any questions regarding your account status, please feel free to contact our system administrator.</p>
            
            <br>
            <p style="margin-bottom: 0;">Best regards,</p>
            <b style="color: #555555;">Avian Blood System Team</b>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0 15px 0;">
            <small style="color: #888888; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</small>
          </div>
        `,
      });
    } catch (err) {
      console.log('Error sending email:', err);
    }

    return {
      message: 'User account activated and notification email sent successfully',
      data: {
        user_id: user.user_id,
        is_active: user.is_active,
      }
    };
  }

  async undoRejectUser(targetUserId: number) {
    const user = await this.userRepository.findOne({
      where: { user_id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_verified === 0) {
      return {
        message: 'User account is already pending verification',
        data: {
          user_id: user.user_id,
          is_verified: user.is_verified,
        }
      };
    }

    if (user.is_verified === 1) {
      throw new BadRequestException('Cannot undo rejection for an already verified user');
    }

    user.is_verified = 0; 

    await this.userRepository.save(user);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Account Status Updated: Under Review - Avian Blood System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; color: #333333;">
            <h2 style="color: #f57c00; margin-top: 0;">Account Status Updated ⏳</h2>
            
            <p>Dear <b>Dr. ${user.first_name} ${user.last_name}</b>,</p>
            
            <p>We would like to inform you that the previous decision regarding your registration account has been reconsidered by our administrative team.</p>
            
            <p>Your account status has been reset and is now back <b>under re-evaluation</b>. Our team will review your veterinary registration and documentation once again.</p>
            
            <!-- กล่องแจ้งเตือนสถานะสีส้ม/อำพัน (Pending) -->
            <div style="background-color: #fff8e1; padding: 15px; border-left: 4px solid #f57c00; margin: 20px 0; border-radius: 4px;">
              <b style="color: #f57c00; font-size: 14px; text-transform: uppercase;">Current Status: Pending Review</b>
              <p style="margin: 8px 0 0 0; color: #444444; line-height: 1.5; font-size: 15px;">
                You do not need to take any action at this time. We will notify you via email as soon as the verification process is complete.
              </p>
            </div>

            <p>If you have submitted additional documents or have questions regarding this update, please contact our system administrator.</p>
            
            <br>
            <p style="margin-bottom: 0;">Best regards,</p>
            <b style="color: #555555;">Avian Blood System Team</b>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0 15px 0;">
            <small style="color: #888888; font-size: 12px;">This is an automated notification. Please do not reply directly to this email.</small>
          </div>
        `,
      });
    } catch (err) {
      console.log('Error sending email:', err);
    }

    return {
      message: 'User rejection has been undone and a notification email has been sent successfully',
      data: {
        user_id: user.user_id,
        is_verified: user.is_verified,
      }
    };
  }

  async deleteMyBatchPredictions(userId: number, batchId: number) {
    const batch = await this.batchRepository.findOne({
      where: { 
        batch_id: batchId, 
        user: { user_id: userId } 
      },
      relations: ['images', 'images.prediction', 'images.prediction.detections'],
    });

    if (!batch) {
      throw new NotFoundException('Batch not found, or you do not have permission to modify it');
    }

    if (!batch.images || batch.images.length === 0) {
      throw new BadRequestException('No images found in this batch.');
    }

    for (const image of batch.images) {
      if (image.prediction) {
        if (image.prediction.detections && image.prediction.detections.length > 0) {
          await this.detectionRepository.remove(image.prediction.detections);
        }
        await this.imageRepository.manager.remove(image.prediction);
      }

      image.image_status = 'pending';
    }

    await this.imageRepository.save(batch.images);

    return {
      message: 'Batch predictions deleted successfully. All images are now set to pending status.',
    };
  }
}
