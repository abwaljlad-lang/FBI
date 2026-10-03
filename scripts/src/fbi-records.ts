import {
  ActionRowBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Attachment,
  type Interaction,
  type Message,
  type ModalSubmitInteraction,
} from "discord.js";
import { GridFSBucket, MongoClient, ObjectId, type Db } from "mongodb";
import { fileURLToPath } from "node:url";

const RECORDS_COMMAND_NAME = "fbi-records";
const RECORDS_MENU_ID = "fbi-records:kind";
const RECORDS_IMAGE_NAME = "fbi-records-cover.jpg";
const RECORDS_IMAGE_PATH = fileURLToPath(
  new URL("../assets/fbi-records-cover.jpg", import.meta.url),
);
const EVIDENCE_UPLOAD_TTL_MS = 15 * 60 * 1000;
const EVIDENCE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const MONGO_DATABASE_NAME = "fbi_records";

const MODAL_IDS = {
  witness: "fbi-records:modal:witness",
  evidence: "fbi-records:modal:evidence",
  informant: "fbi-records:modal:informant",
} as const;

type EvidenceStatus = "awaiting_image" | "saving_image" | "saved" | "expired";

interface EvidenceRecord {
  _id?: ObjectId;
  evidenceName: string;
  description: string;
  acquisitionMethod: string;
  submittedById: string;
  submittedByTag: string;
  guildId: string;
  channelId: string;
  status: EvidenceStatus;
  createdAt: Date;
  expiresAt?: Date;
  imageUploadStartedAt?: Date;
  completedAt?: Date;
  image?: {
    gridFsId: ObjectId;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  };
}

interface ImageFormat {
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
}

class UploadValidationError extends Error {}

let databasePromise: Promise<Db> | undefined;
const activeImageUploads = new Set<string>();

export const fbiRecordsCommand = {
  name: RECORDS_COMMAND_NAME,
  description: "فتح لوحة تسجيل الشهادات والأدلة والعملاء السريين",
};

function buildRecordsPanel(): ContainerBuilder {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(RECORDS_MENU_ID)
    .setPlaceholder("اختر نوع السجل")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("إدراج شهادة شخص")
        .setValue("witness")
        .setDescription("تسجيل اسم الشخص وعمره وعمله وأقواله"),
      new StringSelectMenuOptionBuilder()
        .setLabel("إرفاق دليل")
        .setValue("evidence")
        .setDescription("تسجيل بيانات الدليل ثم إرسال صورته في الخاص"),
      new StringSelectMenuOptionBuilder()
        .setLabel("معلومات العميل السري")
        .setValue("informant")
        .setDescription("تسجيل بيانات العميل السري ومهمته ومدتها"),
    );

  return new ContainerBuilder()
    .setAccentColor(0x9b111e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# 🗂️ FBI — تسجيل السجلات"),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "اختر نوع السجل. ستُدخل البيانات في نموذج خاص ولن تظهر إجاباتك في القناة.",
      ),
    )
    .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu))
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${RECORDS_IMAGE_NAME}`)
          .setDescription("لوحة تسجيل سجلات جهاز FBI"),
      ),
    );
}

function inputRow(
  customId: string,
  label: string,
  style: TextInputStyle,
  placeholder: string,
  maxLength: number,
): ActionRowBuilder<TextInputBuilder> {
  return new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(style)
      .setPlaceholder(placeholder)
      .setRequired(true)
      .setMaxLength(maxLength),
  );
}

function buildWitnessModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(MODAL_IDS.witness)
    .setTitle("إدراج شهادة شخص")
    .addComponents(
      inputRow("witness_name", "اسم الشخص", TextInputStyle.Short, "الاسم الكامل", 100),
      inputRow("witness_age", "العمر", TextInputStyle.Short, "اكتب العمر بالأرقام", 3),
      inputRow("witness_occupation", "العمل", TextInputStyle.Short, "ما عمل الشخص؟", 200),
      inputRow(
        "witness_statement",
        "الأقوال كاملة",
        TextInputStyle.Paragraph,
        "اكتب الأقوال كاملة",
        4000,
      ),
    );
}

function buildEvidenceModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(MODAL_IDS.evidence)
    .setTitle("تسجيل دليل")
    .addComponents(
      inputRow("evidence_name", "اسم الدليل", TextInputStyle.Short, "عنوان مختصر للدليل", 120),
      inputRow(
        "evidence_description",
        "وصف الدليل",
        TextInputStyle.Paragraph,
        "اشرح محتوى الدليل",
        1000,
      ),
      inputRow(
        "evidence_acquired",
        "كيف حصلت عليه؟",
        TextInputStyle.Paragraph,
        "اكتب طريقة الحصول على الدليل",
        1000,
      ),
    );
}

function buildInformantModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(MODAL_IDS.informant)
    .setTitle("معلومات العميل السري")
    .addComponents(
      inputRow(
        "informant_real_name",
        "الاسم الحقيقي",
        TextInputStyle.Short,
        "الاسم الحقيقي للعميل",
        100,
      ),
      inputRow("informant_age", "العمر", TextInputStyle.Short, "اكتب العمر بالأرقام", 3),
      inputRow(
        "informant_tasks",
        "المهام المطلوبة",
        TextInputStyle.Paragraph,
        "ما الذي يجب عليه فعله؟",
        1000,
      ),
      inputRow(
        "informant_start",
        "موعد بدء المهمة",
        TextInputStyle.Short,
        "مثال: YYYY-MM-DD HH:mm",
        100,
      ),
      inputRow(
        "informant_end",
        "موعد انتهاء المهمة",
        TextInputStyle.Short,
        "مثال: YYYY-MM-DD HH:mm",
        100,
      ),
    );
}

async function getRecordsDatabase(): Promise<Db> {
  if (!databasePromise) {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      throw new Error("Missing required secret: MONGODB_URI");
    }

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
    databasePromise = client
      .connect()
      .then(async () => {
        const database = client.db(MONGO_DATABASE_NAME);
        await database.command({ ping: 1 });
        return database;
      })
      .catch(async (error: unknown) => {
        databasePromise = undefined;
        await client.close().catch(() => undefined);
        throw error;
      });
  }

  return databasePromise;
}

export async function verifyFbiRecordsStore(): Promise<void> {
  const database = await getRecordsDatabase();
  await database.command({ ping: 1 });
}

function readRequiredText(interaction: ModalSubmitInteraction, fieldId: string): string {
  return interaction.fields.getTextInputValue(fieldId).trim();
}

function parseAge(value: string): number | undefined {
  if (!/^\d{1,3}$/.test(value)) {
    return undefined;
  }

  const age = Number(value);
  return Number.isInteger(age) && age >= 1 && age <= 120 ? age : undefined;
}

async function submitWitnessStatement(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (!interaction.guildId) {
    await interaction.editReply("يمكن تسجيل الشهادة من داخل خادم Discord فقط.");
    return;
  }

  const personName = readRequiredText(interaction, "witness_name");
  const age = parseAge(readRequiredText(interaction, "witness_age"));
  const occupation = readRequiredText(interaction, "witness_occupation");
  const statement = readRequiredText(interaction, "witness_statement");
  if (!personName || !occupation || !statement) {
    await interaction.editReply("أكمل جميع حقول الشهادة قبل الإرسال.");
    return;
  }
  if (age === undefined) {
    await interaction.editReply("اكتب عمراً صحيحاً بالأرقام، بين 1 و120.");
    return;
  }

  const database = await getRecordsDatabase();
  await database.collection("witnessStatements").insertOne({
    personName,
    age,
    occupation,
    statement,
    submittedById: interaction.user.id,
    submittedByTag: interaction.user.tag,
    guildId: interaction.guildId,
    channelId: interaction.channelId ?? "",
    createdAt: new Date(),
  });
  await interaction.editReply("تم حفظ الشهادة في قاعدة سجلات FBI.");
}

async function submitInformantRecord(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (!interaction.guildId) {
    await interaction.editReply("يمكن تسجيل معلومات العميل من داخل خادم Discord فقط.");
    return;
  }

  const realName = readRequiredText(interaction, "informant_real_name");
  const age = parseAge(readRequiredText(interaction, "informant_age"));
  const tasks = readRequiredText(interaction, "informant_tasks");
  const startsAt = readRequiredText(interaction, "informant_start");
  const endsAt = readRequiredText(interaction, "informant_end");
  if (!realName || !tasks || !startsAt || !endsAt) {
    await interaction.editReply("أكمل جميع حقول العميل السري قبل الإرسال.");
    return;
  }
  if (age === undefined) {
    await interaction.editReply("اكتب عمراً صحيحاً بالأرقام، بين 1 و120.");
    return;
  }

  const database = await getRecordsDatabase();
  await database.collection("confidentialInformants").insertOne({
    realName,
    age,
    tasks,
    startsAt,
    endsAt,
    submittedById: interaction.user.id,
    submittedByTag: interaction.user.tag,
    guildId: interaction.guildId,
    channelId: interaction.channelId ?? "",
    createdAt: new Date(),
  });
  await interaction.editReply("تم حفظ معلومات العميل السري في قاعدة سجلات FBI.");
}

async function submitEvidenceRecord(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (!interaction.guildId) {
    await interaction.editReply("يمكن تسجيل الدليل من داخل خادم Discord فقط.");
    return;
  }

  const evidenceName = readRequiredText(interaction, "evidence_name");
  const description = readRequiredText(interaction, "evidence_description");
  const acquisitionMethod = readRequiredText(interaction, "evidence_acquired");
  if (!evidenceName || !description || !acquisitionMethod) {
    await interaction.editReply("أكمل جميع حقول الدليل قبل الإرسال.");
    return;
  }

  const database = await getRecordsDatabase();
  const evidenceCollection = database.collection<EvidenceRecord>("evidence");
  const now = new Date();
  await evidenceCollection.updateMany(
    {
      submittedById: interaction.user.id,
      status: { $in: ["awaiting_image", "saving_image"] },
      expiresAt: { $lte: now },
    },
    { $set: { status: "expired" } },
  );

  const existingPending = await evidenceCollection.findOne({
    submittedById: interaction.user.id,
    status: { $in: ["awaiting_image", "saving_image"] },
    expiresAt: { $gt: now },
  });
  if (existingPending) {
    await interaction.editReply("لديك دليل ينتظر رفع صورته. أرسل الصورة في الخاص أولاً.");
    return;
  }

  const expiresAt = new Date(now.getTime() + EVIDENCE_UPLOAD_TTL_MS);
  const inserted = await evidenceCollection.insertOne({
    evidenceName,
    description,
    acquisitionMethod,
    submittedById: interaction.user.id,
    submittedByTag: interaction.user.tag,
    guildId: interaction.guildId,
    channelId: interaction.channelId ?? "",
    status: "awaiting_image",
    createdAt: now,
    expiresAt,
  });

  try {
    await interaction.user.send(
      "أرسل صورة واحدة للدليل في هذه الرسالة الخاصة خلال 15 دقيقة. الصيغ المقبولة JPG أو PNG أو WEBP وبحجم أقصى 8 MB. لن تظهر الصورة في القناة.",
    );
  } catch {
    await evidenceCollection.deleteOne({ _id: inserted.insertedId }).catch(() => undefined);
    await interaction.editReply(
      "تعذر فتح رسالة خاصة معك. فعّل استقبال الرسائل الخاصة من أعضاء الخادم ثم أعد تسجيل الدليل.",
    );
    return;
  }

  await interaction.editReply(
    "تم استلام بيانات الدليل. أرسلت لك في الخاص طلب الصورة؛ يكتمل حفظ الدليل بعد رفعها.",
  );
}

async function safelyHandleInteraction(
  interaction: Interaction,
  operation: () => Promise<void>,
): Promise<boolean> {
  try {
    await operation();
  } catch (error) {
    console.error(
      "FBI records interaction failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    if (interaction.isRepliable()) {
      try {
        const content = "تعذر حفظ السجل الآن. حاول مرة أخرى بعد قليل.";
        if (interaction.deferred) {
          await interaction.editReply({ content });
        } else if (interaction.replied) {
          await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
      } catch {
        // The interaction may have expired while the database request was running.
      }
    }
  }

  return true;
}

export async function handleFbiRecordsInteraction(interaction: Interaction): Promise<boolean> {
  if (interaction.isChatInputCommand() && interaction.commandName === RECORDS_COMMAND_NAME) {
    return safelyHandleInteraction(interaction, async () => {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: "استخدم هذا الأمر داخل خادم Discord.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        components: [buildRecordsPanel()],
        files: [{ attachment: RECORDS_IMAGE_PATH, name: RECORDS_IMAGE_NAME }],
        flags: MessageFlags.IsComponentsV2,
      });
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === RECORDS_MENU_ID) {
    return safelyHandleInteraction(interaction, async () => {
      const modal =
        interaction.values[0] === "witness"
          ? buildWitnessModal()
          : interaction.values[0] === "evidence"
            ? buildEvidenceModal()
            : interaction.values[0] === "informant"
              ? buildInformantModal()
              : undefined;

      if (!modal) {
        await interaction.reply({
          content: "نوع السجل غير معروف. أعد فتح القائمة وحاول مرة أخرى.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.showModal(modal);
    });
  }

  if (interaction.isModalSubmit()) {
    const submitHandler =
      interaction.customId === MODAL_IDS.witness
        ? submitWitnessStatement
        : interaction.customId === MODAL_IDS.evidence
          ? submitEvidenceRecord
          : interaction.customId === MODAL_IDS.informant
            ? submitInformantRecord
            : undefined;

    if (submitHandler) {
      return safelyHandleInteraction(interaction, () => submitHandler(interaction));
    }
  }

  return false;
}

function identifyImageFormat(buffer: Buffer): ImageFormat | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: "png", contentType: "image/png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  return undefined;
}

async function downloadEvidenceImage(
  attachment: Attachment,
): Promise<{ bytes: Buffer; format: ImageFormat }> {
  if (attachment.size > EVIDENCE_IMAGE_MAX_BYTES) {
    throw new UploadValidationError("حجم الصورة أكبر من 8 MB. أرسل صورة أصغر.");
  }

  const imageUrl = new URL(attachment.url);
  if (
    imageUrl.protocol !== "https:" ||
    !["cdn.discordapp.com", "media.discordapp.net"].includes(imageUrl.hostname.toLowerCase())
  ) {
    throw new UploadValidationError("تعذر التحقق من الصورة. أرسلها كمرفق مباشر في الخاص.");
  }

  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error("Discord image download failed with status " + response.status);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > EVIDENCE_IMAGE_MAX_BYTES) {
    throw new UploadValidationError("حجم الصورة أكبر من 8 MB. أرسل صورة أصغر.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > EVIDENCE_IMAGE_MAX_BYTES) {
    throw new UploadValidationError("حجم الصورة أكبر من 8 MB. أرسل صورة أصغر.");
  }

  const format = identifyImageFormat(bytes);
  if (!format) {
    throw new UploadValidationError("أرسل صورة صالحة بصيغة JPG أو PNG أو WEBP.");
  }

  return { bytes, format };
}

export async function handleFbiEvidenceUpload(message: Message): Promise<void> {
  if (message.author.bot || message.guildId !== null || message.attachments.size === 0) {
    return;
  }

  let database: Db;
  try {
    database = await getRecordsDatabase();
  } catch (error) {
    console.error(
      "FBI evidence database lookup failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    await message.reply("تعذر الوصول إلى قاعدة السجلات الآن. حاول مرة أخرى لاحقاً.");
    return;
  }

  const evidenceCollection = database.collection<EvidenceRecord>("evidence");
  const now = new Date();
  await evidenceCollection.updateMany(
    {
      submittedById: message.author.id,
      status: { $in: ["awaiting_image", "saving_image"] },
      expiresAt: { $lte: now },
    },
    { $set: { status: "expired" } },
  );

  const recoveryCutoff = new Date(now.getTime() - 2 * 60 * 1000);
  await evidenceCollection.updateMany(
    {
      submittedById: message.author.id,
      status: "saving_image",
      imageUploadStartedAt: { $lt: recoveryCutoff },
      expiresAt: { $gt: now },
    },
    { $set: { status: "awaiting_image" }, $unset: { imageUploadStartedAt: "" } },
  );

  const pending = await evidenceCollection.findOne(
    {
      submittedById: message.author.id,
      status: { $in: ["awaiting_image", "saving_image"] },
      expiresAt: { $gt: now },
    },
    { sort: { createdAt: -1 } },
  );
  if (!pending) {
    await message.reply("لا يوجد دليل ينتظر صورة حالياً. ابدأ من لوحة تسجيل السجلات.");
    return;
  }
  if (pending.status === "saving_image") {
    await message.reply("الصورة السابقة قيد الحفظ. انتظر قليلاً قبل إرسال صورة أخرى.");
    return;
  }
  if (message.attachments.size !== 1) {
    await message.reply("أرسل صورة واحدة فقط لكل دليل.");
    return;
  }

  const attachment = message.attachments.first();
  if (!attachment) {
    return;
  }
  if (attachment.size > EVIDENCE_IMAGE_MAX_BYTES) {
    await message.reply("حجم الصورة أكبر من 8 MB. أرسل صورة أصغر.");
    return;
  }

  const evidenceId = pending._id;
  const evidenceIdText = evidenceId.toHexString();
  if (activeImageUploads.has(evidenceIdText)) {
    await message.reply("الصورة السابقة قيد الحفظ. انتظر قليلاً قبل إرسال صورة أخرى.");
    return;
  }

  activeImageUploads.add(evidenceIdText);
  let lockAcquired = false;
  let gridFsId: ObjectId | undefined;
  let gridFsBucket: GridFSBucket | undefined;
  let saved = false;

  try {
    const lock = await evidenceCollection.updateOne(
      { _id: evidenceId, status: "awaiting_image", expiresAt: { $gt: new Date() } },
      { $set: { status: "saving_image", imageUploadStartedAt: new Date() } },
    );
    if (lock.modifiedCount !== 1) {
      await message.reply("تعذر بدء حفظ الصورة. أعد إرسالها إذا بقي وقت الرفع.");
      return;
    }
    lockAcquired = true;

    const { bytes, format } = await downloadEvidenceImage(attachment);
    const fileName = "evidence-" + evidenceIdText + "." + format.extension;
    gridFsBucket = new GridFSBucket(database, { bucketName: "evidenceImages" });
    const upload = gridFsBucket.openUploadStream(fileName, {
      metadata: {
        contentType: format.contentType,
        submittedById: message.author.id,
        guildId: pending.guildId,
      },
    });
    await new Promise<void>((resolve, reject) => {
      upload.once("finish", resolve);
      upload.once("error", reject);
      upload.end(bytes);
    });
    gridFsId = upload.id;

    const result = await evidenceCollection.updateOne(
      { _id: evidenceId, status: "saving_image" },
      {
        $set: {
          status: "saved",
          image: {
            gridFsId,
            fileName,
            contentType: format.contentType,
            sizeBytes: bytes.length,
          },
          completedAt: new Date(),
        },
        $unset: { expiresAt: "", imageUploadStartedAt: "" },
      },
    );
    if (result.modifiedCount !== 1) {
      throw new Error("Evidence record was not updated after image upload.");
    }
    gridFsId = undefined;
    saved = true;
  } catch (error) {
    if (gridFsId && gridFsBucket) {
      await gridFsBucket.delete(gridFsId).catch(() => undefined);
    }
    if (lockAcquired) {
      await evidenceCollection
        .updateOne(
          { _id: evidenceId, status: "saving_image" },
          { $set: { status: "awaiting_image" }, $unset: { imageUploadStartedAt: "" } },
        )
        .catch(() => undefined);
    }
    const messageText =
      error instanceof UploadValidationError
        ? error.message
        : "تعذر حفظ الصورة. أعد إرسال صورة JPG أو PNG أو WEBP أصغر من 8 MB.";
    console.error(
      "FBI evidence image save failed.",
      error instanceof Error ? error.name : "Unknown error",
    );
    await message.reply(messageText);
  } finally {
    activeImageUploads.delete(evidenceIdText);
  }

  if (saved) {
    await message.reply("تم حفظ صورة الدليل والبيانات في قاعدة سجلات FBI.");
  }
}