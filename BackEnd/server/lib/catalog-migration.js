const CATALOG_VERSION = 2;
const MIN_PRODUCTS_PER_CATEGORY = 10;

const SERIES = [
  "Essential",
  "Daily",
  "Air",
  "Motion",
  "Studio",
  "Weekend",
  "Core",
  "Flex",
  "Soft",
  "Signature",
];

const PROFILES = {
  tee: {
    price: 289000,
    material: "92% cotton compact, 8% spandex; bề mặt mềm, thoáng và có độ co giãn nhẹ.",
    care: "Lộn trái trước khi giặt máy ở nhiệt độ dưới 30°C, giặt cùng màu và phơi trong bóng râm.",
    fit: "Phom regular dễ mặc, vai tự nhiên và chiều dài cân đối.",
    suitableFor: "Đi làm hằng ngày, đi học, đi chơi và phối theo phong cách tối giản.",
    colors: ["Đen", "Trắng ngà", "Xám melange"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-tee-black.png", "/Images/nova-v3/product-tee-cream.png"],
    highlights: ["Cotton compact mềm thoáng", "Co giãn nhẹ khi vận động", "Cổ áo giữ phom"],
  },
  polo: {
    price: 429000,
    material: "Cotton piqué dệt thoáng, pha spandex để bề mặt giữ dáng và dễ vận động.",
    care: "Giặt máy chế độ nhẹ dưới 30°C, cài khuy trước khi giặt và không sấy ở nhiệt độ cao.",
    fit: "Phom regular gọn vai, cổ dệt đứng vừa phải và tay áo ôm nhẹ.",
    suitableFor: "Đi làm, gặp gỡ, dạo phố và những dịp cần vẻ ngoài lịch sự vừa đủ.",
    colors: ["Navy", "Trắng ngà", "Xanh rêu"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-polo-navy.png", "/Images/nova-v3/product-tee-cream.png"],
    highlights: ["Mặt vải piqué thoáng khí", "Cổ dệt giữ phom", "Đường may vai gia cố"],
  },
  shirt: {
    price: 489000,
    material: "55% linen, 45% viscose; nhẹ, thoáng và hạn chế nhăn hơn linen nguyên chất.",
    care: "Giặt nhẹ với nước mát, treo phơi ngay sau khi giặt và ủi hơi ở nhiệt độ trung bình.",
    fit: "Phom relaxed vừa phải, tay áo linh hoạt và vạt áo dễ sơ vin.",
    suitableFor: "Đi làm, dự họp, gặp gỡ và mặc hằng ngày trong thời tiết ấm.",
    colors: ["Xanh sương", "Trắng kem", "Be cát"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-shirt-blue.png", "/Images/nova-v3/product-tee-cream.png"],
    highlights: ["Linen pha ít nhăn", "Thoáng khí tự nhiên", "Vạt áo dễ sơ vin"],
  },
  blouse: {
    price: 459000,
    material: "Viscose pha polyester mềm rủ, bề mặt mịn và có độ thoáng phù hợp khí hậu Việt Nam.",
    care: "Giặt trong túi lưới bằng nước mát, không vắt xoắn và ủi hơi ở nhiệt độ thấp.",
    fit: "Phom nữ tính, rủ nhẹ theo cơ thể nhưng vẫn đủ khoảng cử động.",
    suitableFor: "Đi làm, gặp gỡ, dự tiệc nhẹ và phối cùng quần hoặc chân váy.",
    colors: ["Trắng kem", "Xanh nhạt", "Hồng phấn"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-shirt-blue.png", "/Images/nova-v3/product-tee-cream.png"],
    highlights: ["Bề mặt mềm rủ", "Ít nhăn khi mặc", "Dễ phối nhiều hoàn cảnh"],
  },
  jacket: {
    price: 699000,
    material: "Nylon tái chế cản gió nhẹ, lót lưới thoáng và bề mặt hạn chế bám nước.",
    care: "Giặt lạnh ở chế độ nhẹ, đóng khóa kéo trước khi giặt, không tẩy và không sấy nóng.",
    fit: "Phom regular có khoảng trống để mặc nhiều lớp, gấu áo dễ điều chỉnh.",
    suitableFor: "Đi làm, di chuyển ngoài trời, du lịch và những ngày thời tiết thay đổi.",
    colors: ["Đen", "Xám khói", "Xanh navy"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-jacket-black.png", "/Images/nova-v3/home-story.png"],
    highlights: ["Cản gió nhẹ", "Túi khóa kéo an toàn", "Lót lưới thoáng khí"],
  },
  hoodie: {
    price: 559000,
    material: "Cotton pha polyester chải mềm mặt trong, giữ ấm vừa phải và ổn định phom.",
    care: "Lộn trái, giặt máy chế độ nhẹ với nước mát, không dùng chất tẩy mạnh và phơi ngang.",
    fit: "Phom relaxed thoải mái, vai hạ nhẹ và bo gấu có độ đàn hồi.",
    suitableFor: "Mặc hằng ngày, đi học, di chuyển và phối lớp trong thời tiết mát.",
    colors: ["Xám melange", "Đen", "Kem"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-jacket-black.png", "/Images/nova-v3/product-tee-cream.png"],
    highlights: ["Mặt trong chải mềm", "Mũ hai lớp đứng phom", "Bo gấu đàn hồi"],
  },
  jeans: {
    price: 629000,
    material: "98% cotton denim, 2% elastane; bền dáng nhưng vẫn có độ co giãn khi ngồi và di chuyển.",
    care: "Giặt riêng trong lần đầu, lộn trái và dùng nước mát; hạn chế giặt quá thường xuyên để giữ màu.",
    fit: "Cạp vừa, ống đứng gọn và có khoảng cử động ở đùi.",
    suitableFor: "Mặc hằng ngày, đi làm, đi học và phối cùng áo thun, polo hoặc sơ mi.",
    colors: ["Indigo đậm", "Xanh trung", "Đen wash"],
    sizes: ["28", "29", "30", "31", "32", "34"],
    images: ["/Images/nova-v3/product-jeans-indigo.png", "/Images/nova-v3/product-trouser-beige.png"],
    highlights: ["Denim co giãn nhẹ", "Wash tiết chế", "Đường may chịu lực"],
  },
  khaki: {
    price: 549000,
    material: "Cotton twill pha spandex, bề mặt lì, thoáng và giữ nếp gọn trong ngày dài.",
    care: "Giặt cùng màu ở nhiệt độ dưới 30°C, phơi ngay sau khi giặt và ủi ở nhiệt độ trung bình.",
    fit: "Phom tapered, cạp vừa và ống thu nhẹ từ gối xuống gấu.",
    suitableFor: "Đi làm, gặp gỡ, công tác và mặc hằng ngày theo phong cách smart-casual.",
    colors: ["Be cát", "Đen", "Xanh navy"],
    sizes: ["28", "29", "30", "31", "32", "34"],
    images: ["/Images/nova-v3/product-trouser-beige.png", "/Images/nova-v3/product-jeans-indigo.png"],
    highlights: ["Cotton twill đứng phom", "Co giãn khi vận động", "Cạp trong hoàn thiện sạch"],
  },
  jogger: {
    price: 469000,
    material: "French terry cotton pha polyester, mặt trong vòng sợi thoáng và có độ đàn hồi.",
    care: "Giặt máy chế độ nhẹ, lộn trái, không sấy nóng và tránh treo khi sản phẩm còn quá ướt.",
    fit: "Phom jogger thoải mái ở đùi, bo gấu gọn và cạp dây rút điều chỉnh.",
    suitableFor: "Mặc hằng ngày, di chuyển, tập luyện nhẹ và thư giãn cuối tuần.",
    colors: ["Đen", "Xám chì", "Xanh navy"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-trouser-beige.png", "/Images/nova-v3/product-short-navy.png"],
    highlights: ["Cạp dây rút chắc chắn", "Bo gấu đàn hồi", "Túi sâu tiện dụng"],
  },
  shorts: {
    price: 379000,
    material: "88% nylon, 12% spandex; nhẹ, co giãn bốn chiều và khô nhanh.",
    care: "Giặt lạnh, không dùng nước xả đậm đặc, không ủi trực tiếp và phơi trong bóng râm.",
    fit: "Phom regular trên gối, cạp co giãn và đáy quần đủ rộng để vận động.",
    suitableFor: "Đi chơi, du lịch, vận động nhẹ và mặc hằng ngày trong thời tiết nóng.",
    colors: ["Đen", "Navy", "Xám đá"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-short-navy.png", "/Images/nova-v3/product-trouser-beige.png"],
    highlights: ["Nhanh khô", "Co giãn bốn chiều", "Túi khóa kéo ẩn"],
  },
  legging: {
    price: 429000,
    material: "Nylon pha spandex co giãn bốn chiều, bề mặt mịn và hỗ trợ thoát ẩm khi tập luyện.",
    care: "Giặt riêng bằng nước mát, không dùng nước xả vải, không sấy nóng và tránh bề mặt sắc nhọn.",
    fit: "Cạp cao ôm hỗ trợ, đường may phẳng và ống dài tới mắt cá.",
    suitableFor: "Yoga, pilates, gym, đi bộ và phối athleisure hằng ngày.",
    colors: ["Đen", "Xám than", "Nâu cacao"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-trouser-beige.png", "/Images/nova-v3/promotions-women-color.png"],
    highlights: ["Co giãn bốn chiều", "Cạp cao hỗ trợ", "Đường may phẳng"],
  },
  skirt: {
    price: 469000,
    material: "Polyester tái chế pha viscose, bề mặt mềm rủ, ít nhăn và có lớp lót mỏng.",
    care: "Giặt máy chế độ nhẹ trong túi lưới, không vắt xoắn, phơi trên móc và ủi hơi nhẹ.",
    fit: "Cạp cao vừa, phom chữ A tạo khoảng chuyển động tự nhiên.",
    suitableFor: "Đi làm, dạo phố, gặp gỡ và những dịp cần vẻ ngoài nữ tính gọn gàng.",
    colors: ["Be cát", "Đen", "Xám sương"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-trouser-beige.png", "/Images/nova-v3/promotions-women-color.png"],
    highlights: ["Có lớp lót mỏng", "Cạp sau co giãn", "Bề mặt ít nhăn"],
  },
  dress: {
    price: 649000,
    material: "Viscose pha linen mềm rủ, thoáng và có lớp lót tại những vị trí cần thiết.",
    care: "Giặt nhẹ trong túi lưới bằng nước mát, không vắt xoắn và treo phơi trong bóng râm.",
    fit: "Phom midi tôn dáng vừa phải, eo có khoảng điều chỉnh và tà váy dễ chuyển động.",
    suitableFor: "Đi làm, dạo phố, gặp gỡ và các buổi tiệc nhẹ.",
    colors: ["Đen", "Kem", "Xanh sương"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/promotions-women-color.png", "/Images/nova-v3/product-shirt-blue.png"],
    highlights: ["Có lớp lót phù hợp", "Túi hai bên", "Đường chiết eo gọn"],
  },
  sport: {
    price: 429000,
    material: "Polyester tái chế pha spandex, thoát ẩm nhanh, co giãn và nhẹ khi vận động.",
    care: "Giặt ngay sau khi tập bằng nước mát, không dùng nước xả vải và không sấy nhiệt cao.",
    fit: "Phom thể thao linh hoạt, đường may hạn chế cọ xát và không cản chuyển động.",
    suitableFor: "Chạy bộ, gym, pickleball, yoga và các hoạt động ngoài trời.",
    colors: ["Đen", "Xanh cobalt", "Cam san hô"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/lifestyle-motion-hero.png", "/Images/nova-v3/product-short-navy.png"],
    highlights: ["Thoát ẩm nhanh", "Co giãn đa hướng", "Đường may hạn chế cọ xát"],
  },
  swim: {
    price: 499000,
    material: "Nylon pha elastane chuyên dụng cho đồ bơi, nhanh khô và có khả năng giữ phom.",
    care: "Xả bằng nước sạch ngay sau khi bơi, giặt tay nhẹ, không vắt xoắn và phơi trong bóng râm.",
    fit: "Ôm vừa cơ thể, linh hoạt khi bơi và có lớp lót tại vị trí cần thiết.",
    suitableFor: "Bơi hồ, đi biển, nghỉ dưỡng và hoạt động dưới nước.",
    colors: ["Đen", "Xanh biển", "Xanh rêu"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/lifestyle-motion-hero.png", "/Images/nova-v3/product-short-navy.png"],
    highlights: ["Nhanh khô", "Co giãn tốt dưới nước", "Lớp lót êm"],
  },
  home: {
    price: 399000,
    material: "Modal pha cotton mềm mát, thấm hút tốt và giữ bề mặt êm sau nhiều lần giặt.",
    care: "Giặt máy chế độ nhẹ với nước mát, dùng chất giặt dịu và phơi trong bóng râm.",
    fit: "Phom relaxed rộng vừa phải, cạp mềm và không gây bó khi nghỉ ngơi.",
    suitableFor: "Mặc tại nhà, nghỉ ngơi, làm việc tại nhà và những chuyến đi ngắn.",
    colors: ["Kem", "Hồng phấn", "Xám nhạt"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-tee-cream.png", "/Images/nova-v3/home-category-women-color.png"],
    highlights: ["Modal mềm mát", "Cạp không siết", "Đường may êm"],
  },
  underwear: {
    price: 239000,
    material: "Cotton modal pha elastane, mềm, thoáng và co giãn ổn định cho vùng tiếp xúc da.",
    care: "Giặt riêng trong túi lưới bằng nước mát, không dùng chất tẩy mạnh và không sấy nóng.",
    fit: "Ôm vừa cơ thể, đường viền phẳng và cạp mềm không gây hằn.",
    suitableFor: "Mặc nền hằng ngày và vận động nhẹ.",
    colors: ["Đen", "Be", "Xám nhạt"],
    sizes: ["S", "M", "L", "XL"],
    images: ["/Images/nova-v3/product-tee-cream.png", "/Images/nova-v3/product-tee-black.png"],
    highlights: ["Sợi modal mềm", "Cạp co giãn êm", "Đường viền phẳng"],
  },
  accessory: {
    price: 259000,
    material: "Vật liệu được lựa chọn theo công năng từng phụ kiện, ưu tiên độ bền và dễ vệ sinh.",
    care: "Lau sạch bằng khăn ẩm hoặc vệ sinh theo hướng dẫn trên nhãn; bảo quản nơi khô thoáng.",
    fit: "Thiết kế freesize hoặc có tùy chọn kích thước rõ ràng trong phần lựa chọn.",
    suitableFor: "Hoàn thiện trang phục, đi làm, đi chơi, tập luyện và du lịch.",
    colors: ["Đen", "Kem", "Xanh navy"],
    sizes: ["Freesize"],
    images: ["/Images/nova-v3/home-story.png", "/Images/nova-v3/product-jacket-black.png"],
    highlights: ["Thiết kế đa dụng", "Dễ vệ sinh", "Phối màu tối giản"],
  },
  shoes: {
    price: 799000,
    material: "Thân giày vải dệt thoáng, lớp lót êm và đế cao su có độ bám phù hợp sử dụng hằng ngày.",
    care: "Lau bề mặt bằng khăn ẩm, không ngâm nước lâu, tháo lót khi vệ sinh và phơi nơi thoáng mát.",
    fit: "Phom chuẩn EU, mũi giày có khoảng thoải mái và gót ôm vừa.",
    suitableFor: "Đi làm, dạo phố, du lịch và vận động nhẹ hằng ngày.",
    colors: ["Trắng", "Đen", "Be"],
    sizes: ["36", "37", "38", "39", "40", "41", "42", "43"],
    images: ["/Images/nova-v3/home-category-men-color.png", "/Images/nova-v3/home-category-women-color.png"],
    highlights: ["Đế cao su bám tốt", "Lót giày tháo rời", "Thân giày thoáng"],
  },
};

const CATALOG_CATEGORIES = [
  { id: "cat-tee", sku: "MTS", name: "Áo thun nam", slug: "ao-thun-nam", audience: "men", profile: "tee", description: "T-shirt, áo graphic và áo tank cho nam." },
  { id: "cat-polo", sku: "MPO", name: "Áo polo nam", slug: "ao-polo-nam", audience: "men", profile: "polo", description: "Polo lịch sự vừa đủ cho ngày thường." },
  { id: "cat-shirt", sku: "MSH", name: "Áo sơ mi nam", slug: "ao-so-mi-nam", audience: "men", profile: "shirt", description: "Sơ mi đi làm và đi chơi cho nam." },
  { id: "cat-jacket", sku: "MJK", name: "Áo khoác nam", slug: "ao-khoac-nam", audience: "men", profile: "jacket", description: "Jacket, bomber và lớp ngoài cho nam." },
  { id: "cat-hoodie", sku: "MHD", name: "Áo nỉ & hoodie nam", slug: "ao-ni-hoodie-nam", audience: "men", profile: "hoodie", description: "Lớp mặc ấm nhẹ, dễ phối cho nam." },
  { id: "cat-jeans", sku: "MJN", name: "Quần jeans nam", slug: "quan-jeans-nam", audience: "men", profile: "jeans", description: "Denim bền dáng cho mọi ngày." },
  { id: "cat-khaki", sku: "MKA", name: "Quần kaki nam", slug: "quan-kaki-nam", audience: "men", profile: "khaki", description: "Gọn gàng, linh hoạt và dễ mặc." },
  { id: "cat-jogger", sku: "MJG", name: "Quần jogger nam", slug: "quan-jogger-nam", audience: "men", profile: "jogger", description: "Thoải mái cho nhịp sống năng động." },
  { id: "cat-shorts", sku: "MST", name: "Quần short nam", slug: "quan-short-nam", audience: "men", profile: "shorts", description: "Gọn nhẹ cho ngày nắng và vận động." },
  { id: "cat-men-sport", sku: "MSP", name: "Đồ thể thao nam", slug: "do-the-thao-nam", audience: "men", profile: "sport", description: "Trang phục chạy bộ, gym và vận động cho nam." },
  { id: "cat-men-swim", sku: "MSW", name: "Đồ bơi nam", slug: "do-boi-nam", audience: "men", profile: "swim", description: "Nhanh khô, linh hoạt dưới nước." },
  { id: "cat-underwear", sku: "MUW", name: "Đồ lót nam", slug: "do-lot-nam", audience: "men", profile: "underwear", description: "Nền tảng thoải mái cho cả ngày." },
  { id: "cat-accessories", sku: "MAC", name: "Phụ kiện nam", slug: "phu-kien-nam", audience: "men", profile: "accessory", description: "Mũ, tất, túi và các điểm nhấn nhỏ cho nam." },
  { id: "cat-shoes", sku: "MSO", name: "Giày & dép nam", slug: "giay-dep-nam", audience: "men", profile: "shoes", description: "Hoàn thiện trang phục nam." },
  { id: "cat-women-tee", sku: "WTS", name: "Áo thun nữ", slug: "ao-thun-nu", audience: "women", profile: "tee", description: "T-shirt và áo ôm mềm cho nữ." },
  { id: "cat-women-tops", sku: "WBL", name: "Áo kiểu & blouse", slug: "ao-kieu-blouse", audience: "women", profile: "blouse", description: "Áo nữ đi làm, đi chơi và dễ phối." },
  { id: "cat-women-shirt", sku: "WSH", name: "Áo sơ mi nữ", slug: "ao-so-mi-nu", audience: "women", profile: "shirt", description: "Sơ mi phom nữ tính và linh hoạt." },
  { id: "cat-women-jacket", sku: "WJK", name: "Áo khoác nữ", slug: "ao-khoac-nu", audience: "women", profile: "jacket", description: "Blazer, cardigan và jacket cho nữ." },
  { id: "cat-women-hoodie", sku: "WHD", name: "Áo nỉ & hoodie nữ", slug: "ao-ni-hoodie-nu", audience: "women", profile: "hoodie", description: "Lớp mặc ấm nhẹ, năng động cho nữ." },
  { id: "cat-women-jeans", sku: "WJN", name: "Quần jeans nữ", slug: "quan-jeans-nu", audience: "women", profile: "jeans", description: "Jeans skinny, straight và wide-leg." },
  { id: "cat-women-legging", sku: "WLG", name: "Quần legging nữ", slug: "quan-legging-nu", audience: "women", profile: "legging", description: "Co giãn tốt cho vận động mỗi ngày." },
  { id: "cat-women-shorts", sku: "WST", name: "Quần short nữ", slug: "quan-short-nu", audience: "women", profile: "shorts", description: "Gọn nhẹ, thoáng và dễ phối." },
  { id: "cat-skirt", sku: "WSK", name: "Chân váy", slug: "chan-vay", audience: "women", profile: "skirt", description: "Mini, midi và chân váy xếp ly." },
  { id: "cat-dress", sku: "WDR", name: "Váy & đầm", slug: "vay-dam", audience: "women", profile: "dress", description: "Váy liền và đầm cho nhiều dịp." },
  { id: "cat-women-sport", sku: "WSP", name: "Đồ thể thao nữ", slug: "do-the-thao-nu", audience: "women", profile: "sport", description: "Bra, set tập và đồ vận động cho nữ." },
  { id: "cat-women-swim", sku: "WSW", name: "Đồ bơi nữ", slug: "do-boi-nu", audience: "women", profile: "swim", description: "Bikini, đồ bơi liền thân và cover-up." },
  { id: "cat-home", sku: "WHO", name: "Đồ mặc nhà nữ", slug: "do-mac-nha-nu", audience: "women", profile: "home", description: "Êm mềm cho giờ thư giãn." },
  { id: "cat-women-underwear", sku: "WUW", name: "Đồ lót nữ", slug: "do-lot-nu", audience: "women", profile: "underwear", description: "Nội y và đồ mặc nền thoải mái." },
  { id: "cat-women-accessories", sku: "WAC", name: "Phụ kiện nữ", slug: "phu-kien-nu", audience: "women", profile: "accessory", description: "Túi, mũ, tất và điểm nhấn nhỏ cho nữ." },
  { id: "cat-women-shoes", sku: "WSO", name: "Giày & dép nữ", slug: "giay-dep-nu", audience: "women", profile: "shoes", description: "Hoàn thiện trang phục nữ." },
];

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalize(value) {
  return slugify(value).replace(/-/g, " ");
}

function nextProductNumber(products) {
  return products.reduce((max, product) => {
    const match = String(product.id || "").match(/(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
}

function distributeStock(sizes, colors, totalStock) {
  const combinations = sizes.flatMap((size) => colors.map((color) => ({ size, color })));
  const total = Math.max(combinations.length, Number(totalStock || combinations.length * 3));
  const base = Math.floor(total / combinations.length);
  let remainder = total % combinations.length;
  return combinations.map((variant) => ({
    ...variant,
    stock: base + (remainder-- > 0 ? 1 : 0),
  }));
}

function categoryForExistingProduct(product) {
  const text = normalize(`${product.name} ${product.slug}`);
  const isWomen = product.audience === "women";
  if (/dam|vay lien/.test(text)) return "cat-dress";
  if (/chan vay/.test(text)) return "cat-skirt";
  if (/legging/.test(text)) return "cat-women-legging";
  if (/polo/.test(text)) return isWomen ? "cat-women-tee" : "cat-polo";
  if (/jeans|denim/.test(text)) return isWomen ? "cat-women-jeans" : "cat-jeans";
  if (/short/.test(text)) return isWomen ? "cat-women-shorts" : "cat-shorts";
  if (/khoac|jacket|blazer/.test(text)) return isWomen ? "cat-women-jacket" : "cat-jacket";
  if (/so mi|shirt/.test(text)) return isWomen ? "cat-women-shirt" : "cat-shirt";
  if (/thun|tee/.test(text)) return isWomen ? "cat-women-tee" : "cat-tee";
  const known = CATALOG_CATEGORIES.find((category) => category.id === product.categoryId);
  return known?.id || (isWomen ? "cat-women-tee" : "cat-tee");
}

function enrichProduct(product, category) {
  const profile = PROFILES[category.profile];
  const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : profile.colors;
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : profile.sizes;
  product.categoryId = category.id;
  product.audience = category.audience;
  product.colors = colors;
  product.sizes = sizes;
  product.image = product.image || profile.images[0];
  if (!Array.isArray(product.images) || product.images.length < 2) {
    product.images = [...new Set([product.image, ...(product.images || []), ...profile.images])].slice(0, 2);
  }
  product.longDescription ||= `${category.description} Sản phẩm được hoàn thiện theo tinh thần tối giản của NOVAWEAR, chú trọng cảm giác mặc, độ bền đường may và khả năng phối trong nhiều lịch trình.`;
  product.materials ||= profile.material;
  product.care ||= profile.care;
  product.fit ||= profile.fit;
  product.suitableFor ||= profile.suitableFor;
  product.modelInfo ||= category.audience === "women"
    ? "Người mẫu cao 168 cm, mặc size S. Hãy đối chiếu bảng số đo riêng của sản phẩm trước khi chọn."
    : "Người mẫu cao 180 cm, mặc size M. Hãy đối chiếu bảng số đo riêng của sản phẩm trước khi chọn.";
  product.origin ||= "Thiết kế và hoàn thiện tại Việt Nam";
  if (!Array.isArray(product.highlights) || !product.highlights.length) product.highlights = [...profile.highlights];
  if (!Array.isArray(product.featureDetails) || !product.featureDetails.length) {
    product.featureDetails = [
      { title: "Chất liệu đúng công năng", description: profile.material },
      { title: "Phom dáng dễ ứng dụng", description: profile.fit },
      { title: "Hoàn thiện để mặc lâu", description: "Các vị trí chịu lực được gia cố, đường may được kiểm tra trước khi nhập kho." },
    ];
  }
  if (!Array.isArray(product.variants) || !product.variants.length) {
    product.variants = distributeStock(sizes, colors, product.stock);
    product.stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  }
}

function createCatalogProduct(category, index, idNumber, createdAt) {
  const profile = PROFILES[category.profile];
  const series = SERIES[index % SERIES.length];
  const price = profile.price + index * 10000;
  const sizes = [...profile.sizes];
  const colors = [...profile.colors];
  const variants = distributeStock(sizes, colors, Math.max(24, sizes.length * colors.length * 3));
  return {
    id: `prd-${String(idNumber).padStart(3, "0")}`,
    sku: `NVA-${category.sku}-${String(index + 1).padStart(2, "0")}`,
    name: `${category.name} ${series}`,
    slug: `${category.slug}-${slugify(series)}`,
    categoryId: category.id,
    audience: category.audience,
    price,
    comparePrice: 0,
    saleEndsAt: "",
    cost: Math.round((price * 0.48) / 1000) * 1000,
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    status: "active",
    featured: false,
    badge: index === 0 ? "Mới" : "",
    image: profile.images[0],
    images: [...profile.images],
    colors,
    sizes,
    variants,
    description: `${category.description} Phiên bản ${series} ưu tiên độ thoải mái, phom dễ mặc và chi tiết hoàn thiện gọn gàng.`,
    longDescription: `${category.description} Mẫu ${series} được phát triển cho nhịp sống hiện đại: chất liệu được chọn theo đúng công năng, phom có khoảng cử động hợp lý và các chi tiết tiếp xúc với cơ thể được xử lý êm. Thiết kế giữ bảng màu trung tính để dễ phối, đồng thời vẫn đủ bền cho tần suất sử dụng thường xuyên.`,
    materials: profile.material,
    care: profile.care,
    fit: profile.fit,
    suitableFor: profile.suitableFor,
    modelInfo: category.audience === "women"
      ? "Người mẫu cao 168 cm, mặc size S. Hãy đối chiếu số đo cơ thể với bảng size trước khi chọn."
      : "Người mẫu cao 180 cm, mặc size M. Hãy đối chiếu số đo cơ thể với bảng size trước khi chọn.",
    origin: "Thiết kế và hoàn thiện tại Việt Nam",
    highlights: [...profile.highlights],
    featureDetails: [
      { title: "Chất liệu đúng công năng", description: profile.material },
      { title: "Phom dáng dễ ứng dụng", description: profile.fit },
      { title: "Hoàn thiện để mặc lâu", description: "Đường may chính được gia cố và từng sản phẩm được kiểm tra trước khi nhập kho." },
    ],
    rating: 0,
    reviewCount: 0,
    sold: 0,
    createdAt,
  };
}

function applyCatalogMigration(data, options = {}) {
  if (!data || typeof data !== "object") throw new Error("Dữ liệu catalog không hợp lệ.");
  data.meta = data.meta || {};
  if (Number(data.meta.catalogVersion || 0) >= CATALOG_VERSION) {
    return { changed: false, addedProducts: 0, categories: CATALOG_CATEGORIES.length };
  }
  data.categories = Array.isArray(data.categories) ? data.categories : [];
  data.products = Array.isArray(data.products) ? data.products : [];
  const minimum = Math.max(1, Number(options.minimum || MIN_PRODUCTS_PER_CATEGORY));
  const createdAt = new Date().toISOString();

  for (const definition of CATALOG_CATEGORIES) {
    let category = data.categories.find((item) => item.id === definition.id)
      || data.categories.find((item) => item.slug === definition.slug)
      || data.categories.find((item) => normalize(item.name) === normalize(definition.name));
    if (!category) {
      category = { id: definition.id };
      data.categories.push(category);
    }
    Object.assign(category, {
      name: definition.name,
      slug: definition.slug,
      description: definition.description,
      audience: definition.audience,
      status: "active",
    });
  }

  for (const product of data.products) {
    const categoryId = categoryForExistingProduct(product);
    const category = CATALOG_CATEGORIES.find((item) => item.id === categoryId);
    if (category) enrichProduct(product, category);
  }

  const obsoleteIds = new Set(["cat-pants", "cat-sport", "cat-swim"]);
  data.categories = data.categories.filter((category) => (
    !obsoleteIds.has(category.id)
    || data.products.some((product) => product.categoryId === category.id)
  ));

  let idNumber = nextProductNumber(data.products);
  let addedProducts = 0;
  const usedSkus = new Set(data.products.map((product) => String(product.sku || "").toUpperCase()));
  for (const category of CATALOG_CATEGORIES) {
    const existing = data.products.filter((product) => product.categoryId === category.id && product.status === "active");
    for (let index = existing.length; index < minimum; index += 1) {
      let product = createCatalogProduct(category, index, idNumber++, createdAt);
      while (usedSkus.has(product.sku)) {
        product = createCatalogProduct(category, index, idNumber++, createdAt);
        product.sku = `${product.sku}-${idNumber}`;
      }
      usedSkus.add(product.sku);
      data.products.push(product);
      addedProducts += 1;
    }
  }

  data.meta.catalogVersion = CATALOG_VERSION;
  data.meta.catalogMigratedAt = createdAt;
  data.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  data.auditLogs.unshift({
    id: `log-${Date.now()}-catalog`,
    action: "catalog_migration",
    entity: "catalog",
    entityId: `v${CATALOG_VERSION}`,
    actorId: null,
    actorName: "Hệ thống",
    at: createdAt,
  });
  return { changed: true, addedProducts, categories: CATALOG_CATEGORIES.length };
}

module.exports = {
  CATALOG_CATEGORIES,
  CATALOG_VERSION,
  MIN_PRODUCTS_PER_CATEGORY,
  applyCatalogMigration,
};
