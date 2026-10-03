import {
  ActionRowBuilder,
  Client,
  ContainerBuilder,
  Events,
  GatewayIntentBits,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { fileURLToPath } from "node:url";

const COMMAND_NAME = "fbi-rules";
const SELECT_ID = "fbi-rules:section";
const IMAGE_NAME = "fbi-rules-cover.jpg";
const IMAGE_PATH = fileURLToPath(new URL("../assets/fbi-rules-cover.jpg", import.meta.url));

const RULE_SECTIONS = [
  {
    id: "joining",
    label: "شروط الانضمام",
    description: "متطلبات قبول المتقدمين في جهاز FBI",
    title: "🔴 أولاً — شروط الانضمام",
    body: `1. أن يكون المتقدم مواطناً صالحاً داخل المدينة ولا توجد عليه قضايا جنائية خطيرة.
2. أن يكون سجله الأمني نظيفاً أو خالياً من الجرائم التي تمنع التوظيف.
3. امتلاك خبرة سابقة في المجال الأمني أو اجتياز التدريب المطلوب.
4. اجتياز المقابلة الشخصية والتحقيق الأمني.
5. اجتياز الاختبارات النظرية والميدانية.
6. أن يكون المتقدم قادراً على التعامل مع الأسلحة والتحقيقات والمواقف الخطرة.
7. أن يكون قادراً على العمل تحت الضغط.
8. الالتزام بالتسلسل الإداري وعدم تجاوز الرتب.
9. عدم وجود علاقات إجرامية تؤثر على عمله داخل الجهاز.
10. عدم العمل لصالح أي عصابة أو منظمة إجرامية أثناء الخدمة.
11. قبول التفتيش والتحقيق الداخلي عند الاشتباه بوجود مخالفة.
12. الموافقة على جميع قوانين السرية والولاء الخاصة بالجهاز.`,
  },
  {
    id: "secrecy",
    label: "قانون السرية",
    description: "حماية المعلومات والتحقيقات السرية",
    title: "🔒 ثانياً — قانون السرية",
    body: `جميع المعلومات التي يحصل عليها عميل FBI أثناء عمله تعتبر معلومات سرية.

يُمنع على العميل:
- إفشاء معلومات التحقيقات.
- كشف هوية العملاء السريين.
- كشف مواقع العمليات.
- تسليم ملفات القضايا لأي شخص غير مخول.
- إخبار المشتبه بهم بوجود تحقيق ضدهم.
- إعطاء العصابات معلومات عن تحركات FBI.
- بيع المعلومات أو الأدلة.
- نقل معلومات الجهاز إلى الشرطة أو أي جهة أخرى دون تصريح.
- استخدام معلومات FBI لمصلحة شخصية.

⚠️ **العقوبة:** تسريب المعلومات بشكل متعمد يُعتبر خيانة عظمى للجهاز، وعقوبته الفصل النهائي، ومصادرة صلاحيات العميل، ومحاكمة داخل الـRP، وحكم الإعدام داخل الـRP حسب قانون المدينة.`,
  },
  {
    id: "betrayal",
    label: "قانون الخيانة",
    description: "الأفعال التي تعد خيانة للجهاز",
    title: "🩸 ثالثاً — قانون الخيانة",
    body: `الخيانة هي أخطر مخالفة يمكن أن يرتكبها عضو FBI.

وتعتبر خيانة:
- التعاون السري مع العصابات.
- العمل كجاسوس داخل الجهاز.
- تسليم معلومات سرية.
- بيع ملفات FBI.
- تحذير مجرم من عملية قادمة.
- مساعدة مجرم على الهروب باستخدام معلومات الجهاز.
- إخفاء الأدلة لصالح جهة إجرامية.
- التخطيط ضد الجهاز مع جهة خارجية.
- سرقة ملفات أو أدلة وتسليمها لطرف آخر.
- إفشاء هوية عميل يعمل متخفياً.

☠️ **الحكم:** الخيانة العظمى = الإعدام داخل الـRP. لا يجوز إصدار الحكم إلا بعد وجود أدلة واضحة وتحقيق داخلي وإثبات الخيانة.`,
  },
  {
    id: "undercover",
    label: "العملاء السريون",
    description: "التزامات العميل خلال المهمة السرية",
    title: "🕵️ رابعاً — قانون العملاء السريين",
    body: `في حال تكليف العميل بمهمة سرية:
1. يمنع كشف هويته الحقيقية.
2. يمنع إخبار أي شخص خارج فريق العملية.
3. يمنع التواصل مع أي شخص بطريقة قد تكشف العملية.
4. يمنع استخدام معلومات العملية لمصلحة شخصية.
5. يمنع ترك العملية دون إذن المسؤول.
6. عند انتهاء المهمة يجب تسليم جميع المعلومات والأدلة للجهاز.`,
  },
  {
    id: "case-files",
    label: "ملفات القضايا",
    description: "حماية الملفات والأدلة الرسمية",
    title: "📁 خامساً — قانون ملفات القضايا",
    body: `جميع الملفات والأدلة الموجودة لدى FBI تعتبر ملكية رسمية للجهاز.

يُمنع:
- سرقة الملفات.
- حذف الملفات.
- تعديل الأدلة.
- تزوير التقارير.
- إخفاء الأدلة.
- إعطاء الملفات للعصابات.
- إعطاء الملفات للمدنيين.
- استخدام الملفات للابتزاز.`,
  },
  {
    id: "abuse",
    label: "استغلال المنصب",
    description: "منع استخدام الصلاحيات لمصلحة شخصية",
    title: "⚖️ سادساً — قانون استغلال المنصب",
    body: `يُمنع على أي عميل استخدام منصبه من أجل:
- الانتقام الشخصي.
- ابتزاز المواطنين.
- أخذ أموال مقابل خدمات.
- حماية مجرم.
- تلفيق قضية.
- إسقاط قضية مقابل منفعة.
- استخدام معدات أو مركبات FBI لأغراض شخصية.
- استخدام صلاحيات الجهاز للحصول على معلومات شخصية عن المواطنين دون سبب رسمي.`,
  },
  {
    id: "force",
    label: "استخدام القوة",
    description: "ضوابط استخدام القوة والأسلحة",
    title: "🔫 سابعاً — قانون استخدام القوة",
    body: `لا يجوز استخدام القوة إلا عند وجود سبب قانوني داخل الـRP.

يُمنع:
- إطلاق النار دون سبب.
- قتل شخص لمجرد الاشتباه.
- تعذيب المشتبه بهم.
- الانتقام من المجرمين.
- استخدام السلاح لإجبار شخص على الاعتراف.
- استخدام القوة المفرطة دون ضرورة.

يجب على العميل، متى سمحت الظروف، استخدام التدرج في استخدام القوة والاعتماد على الإجراءات القانونية.`,
  },
  {
    id: "arrests",
    label: "الاعتقالات",
    description: "الإجراءات المطلوبة عند القبض على شخص",
    title: "🚨 ثامناً — قانون الاعتقالات",
    body: `عند القبض على شخص:
1. يجب توضيح سبب الاعتقال.
2. يجب التعامل مع المتهم وفق إجراءات المدينة.
3. يمنع الاعتقال بسبب عداوة شخصية.
4. يمنع تلفيق التهم.
5. يمنع إجبار المتهم على الاعتراف.
6. يجب توثيق الاعتقال والتحقيق عند الحاجة.`,
  },
  {
    id: "investigations",
    label: "التحقيقات",
    description: "قواعد فتح التحقيق وجمع الأدلة",
    title: "🧑‍⚖️ تاسعاً — التحقيقات",
    body: `يحق لـFBI فتح تحقيق في القضايا التي تدخل ضمن اختصاصه.

ويجب على العميل:
- جمع الأدلة.
- توثيق المعلومات.
- عدم تغيير الأدلة.
- عدم تلفيق الأدلة.
- المحافظة على سرية التحقيق.
- عدم كشف تفاصيل التحقيق للمشتبه به دون سبب.`,
  },
  {
    id: "chain-of-command",
    label: "التسلسل الإداري",
    description: "الرتب واحترام المسؤول المباشر",
    title: "🏛️ عاشراً — التسلسل الإداري",
    body: `يجب على كل عضو احترام التسلسل الإداري:

**Agent → Senior Agent → Supervisor → ASAC → SAC → Deputy Director → Director**

ولا يحق للعضو تجاوز المسؤول المباشر إلا في الحالات الطارئة أو عند وجود تعارض مصالح أو أمر مخالف للقانون.`,
  },
  {
    id: "cooperation",
    label: "العلاقات مع الجهات",
    description: "التعاون ومشاركة المعلومات مع الجهات الأخرى",
    title: "🤝 الحادي عشر — العلاقات مع الجهات الأخرى",
    body: `يمكن لـFBI التعاون مع:
- الشرطة.
- الشرطة الفيدرالية.
- الجهات الحكومية.
- القضاء.
- الوحدات الأمنية الأخرى.

ولكن لا يجوز مشاركة المعلومات السرية إلا مع الأشخاص المصرح لهم بالحصول عليها.`,
  },
  {
    id: "corruption",
    label: "الرشوة والفساد",
    description: "منع الرشوة واستغلال السلطة للمال",
    title: "💰 الثاني عشر — الرشوة والفساد",
    body: `يُمنع منعاً باتاً على عضو FBI:
- قبول رشوة.
- بيع المعلومات.
- إسقاط قضية مقابل المال.
- حماية مجرم مقابل منفعة.
- سرقة أموال المضبوطات.
- أخذ الأدلة لنفسه.
- استغلال السلطة لتحقيق مكاسب مالية.

الفساد المتعمد قد يُعامل كخيانة للجهاز.`,
  },
  {
    id: "loyalty",
    label: "الولاء",
    description: "تقديم الولاء للجهاز والقانون",
    title: "🧠 الثالث عشر — الولاء",
    body: `عضو FBI يجب أن يكون ولاؤه للجهاز والقانون.

لا يجوز أن يكون ولاؤه لصديق، أو قريب، أو عصابة، أو منظمة، أو مصلحة شخصية.

إذا تعارضت مصلحة العضو الشخصية مع مصلحة الجهاز، يجب عليه التنحي عن القضية وإبلاغ المسؤول.`,
  },
  {
    id: "high-treason",
    label: "الخيانة العظمى",
    description: "العقوبات والتحقيق المطلوب لإثبات الخيانة",
    title: "☠️ الرابع عشر — قانون الخيانة العظمى",
    body: `**«الخيانة لا تُغفر.»**

كل عضو يثبت أنه خان الجهاز، و سرّب معلومات سرية، وتعاون مع جهة معادية يُعتبر مرتكباً للخيانة العظمى.

العقوبات داخل الـRP:
🔴 الفصل النهائي من FBI
🔴 سحب جميع الصلاحيات
🔴 مصادرة معدات الجهاز
🔴 فتح محاكمة داخلية
🔴 إدراج اسمه كخائن للجهاز
☠️ الحكم بالإعدام داخل الـRP وفق قانون المدينة

ولا يُنفذ الحكم بمجرد الاتهام؛ يجب وجود تحقيق وأدلة وإثبات للخيانة.`,
  },
  {
    id: "oath",
    label: "قسم FBI",
    description: "نص القسم الذي يؤديه العميل عند القبول",
    title: "🦅 قسم FBI",
    body: `عند قبول العميل، يؤدي القسم:

> «أقسم بأن أحافظ على أسرار هذا الجهاز، وأن أحترم القانون، وأن أؤدي واجبي دون خوف أو محاباة، وألا أبيع أو أسرب أو أستخدم المعلومات التي أطلع عليها لمصلحتي الشخصية، وألا أخون زملائي أو الجهاز الذي منحني ثقته. وأعلم أن خيانة هذه الثقة تجعلني عدواً للجهاز الذي أقسمت على خدمته.»`,
  },
  {
    id: "motto",
    label: "شعار الجهاز",
    description: "شعار جهاز FBI",
    title: "🔥 شعار الجهاز",
    body: `> «أنت لا تحمل شارة FBI... أنت تحمل ثقة الجهاز كاملة.»`,
  },
] as const;

type RuleSectionId = (typeof RULE_SECTIONS)[number]["id"];

function buildRulesPanel(): ContainerBuilder {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(SELECT_ID)
    .setPlaceholder("اختر قسماً لعرض قوانينه")
    .addOptions(
      ...RULE_SECTIONS.map((section) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(section.label)
          .setValue(section.id)
          .setDescription(section.description),
      ),
    );

  return new ContainerBuilder()
    .setAccentColor(0x9b111e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# 🦅 FBI — شروط وقوانين الانضمام\n**Federal Bureau of Investigation**",
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "## نبذة عن القطاع\n\nيُعد جهاز FBI من أعلى الأجهزة الأمنية حساسية داخل المدينة، ويُمنح أفراده صلاحيات ومعلومات سرية لا يمكن مشاركتها مع أي جهة خارج الجهاز.\n\nاختر قسماً من القائمة لعرض قوانينه.",
      ),
    )
    .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu))
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${IMAGE_NAME}`)
          .setDescription("صورة قوانين جهاز FBI"),
      ),
    );
}

function buildSectionContainer(sectionId: RuleSectionId): ContainerBuilder {
  const selectedSection = RULE_SECTIONS.find((section) => section.id === sectionId);
  if (!selectedSection) {
    throw new Error(`Unknown FBI rules section: ${sectionId}`);
  }

  return new ContainerBuilder()
    .setAccentColor(0x9b111e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${selectedSection.title}\n\n${selectedSection.body}`),
    );
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commandData = {
  name: COMMAND_NAME,
  description: "عرض شروط وقوانين جهاز FBI",
};

client.once(Events.ClientReady, async (readyClient) => {
  try {
    const commands = await readyClient.application.commands.fetch();
    const existingCommand = commands.find((command) => command.name === COMMAND_NAME);
    if (!existingCommand) {
      await readyClient.application.commands.create(commandData);
    }
    console.info(`FBI rules bot is ready as ${readyClient.user.tag}.`);
  } catch (error) {
    console.error("Could not register the /fbi-rules command.", error);
    process.exitCode = 1;
    readyClient.destroy();
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === COMMAND_NAME) {
      await interaction.reply({
        components: [buildRulesPanel()],
        files: [{ attachment: IMAGE_PATH, name: IMAGE_NAME }],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === SELECT_ID) {
      const selectedSection = RULE_SECTIONS.find(
        (section) => section.id === interaction.values[0],
      );
      if (!selectedSection) {
        await interaction.reply({
          content: "هذا القسم غير موجود. أعد فتح القائمة واختر قسماً آخر.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        components: [buildSectionContainer(selectedSection.id)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error("FBI rules interaction failed.", error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "تعذر عرض القوانين الآن. حاول مرة أخرى بعد قليل.",
        ephemeral: true,
      });
    }
  }
});

client.on(Events.Error, (error) => {
  console.error("Discord client error.", error);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error("Missing required secret: DISCORD_BOT_TOKEN");
}

await client.login(token);