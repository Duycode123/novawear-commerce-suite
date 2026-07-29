const API_BASE = process.env.NOVA_API_BASE || "http://localhost:5000/api";

const imageSets = {
  tee: ["/Images/nova-v3/product-tee-black.png", "/Images/nova-v3/product-tee-cream.png"],
  polo: ["/Images/nova-v3/product-polo-navy.png", "/Images/polo-excool-trang-1.jpg"],
  shirt: ["/Images/nova-v3/product-shirt-blue.png", "/Images/SO_MI_DAI2x.png"],
  jacket: ["/Images/nova-v3/product-jacket-black.png", "/Images/aodaitay.PNG"],
  jeans: ["/Images/nova-v3/product-jeans-indigo.png", "/Images/jeansv2dam_25_672x990.jpg"],
  trousers: ["/Images/nova-v3/product-trouser-beige.png", "/Images/uxamsoro_copy_672x990.jpg"],
  shorts: ["/Images/nova-v3/product-short-navy.png", "/Images/navyshort_672x990.jpg"],
  sport: ["/Images/dothethao.png", "/Images/5in-recy_6_copy2su.jpg"],
  swim: ["/Images/blue_copy.jpg", "/Images/v2_dam_copy_672x990.jpg"],
  home: ["/Images/domactrongnha.png", "/Images/Corona-xam1.jpg"],
  underwear: ["/Images/anhquansip.png", "/Images/comb2_64.jpg"],
  accessories: ["/Images/anh4.png", "/Images/anh3.png"],
  shoes: ["/Images/anh1.png", "/Images/23e4_93.jpg"],
  women: ["/Images/DSC08342_672x990.jpg", "/Images/BT5A9235f_46_672x990.jpg"],
};

const profiles = {
  tee: {
    materials: "Cotton compact pha spandex, bề mặt mềm mịn, thấm hút tốt và có độ co giãn nhẹ.",
    fit: "Phom suông vừa, vai cân đối, cổ tròn bo gọn; tạo cảm giác thoải mái nhưng vẫn chỉn chu.",
    suitableFor: "Mặc hằng ngày, đi học, đi làm trong môi trường thoải mái, đi chơi hoặc phối lớp.",
    care: "Giặt máy chế độ nhẹ ở nhiệt độ tối đa 30°C. Lộn trái trước khi giặt, giặt cùng màu tương tự, không dùng chất tẩy mạnh và phơi trong bóng râm.",
    highlights: ["Mềm và thoáng", "Giữ phom ổn định", "Dễ phối nhiều phong cách"],
    features: [
      { title: "Bề mặt cotton mềm", description: "Sợi vải được xử lý để hạn chế cảm giác thô ráp, phù hợp mặc trực tiếp trên da trong thời gian dài." },
      { title: "Độ co giãn vừa đủ", description: "Tỷ lệ sợi co giãn hỗ trợ các chuyển động thường ngày mà không làm áo nhanh mất phom." },
      { title: "Đường may gọn", description: "Vai, cổ và gấu áo được hoàn thiện chắc chắn để tăng độ bền khi sử dụng thường xuyên." },
    ],
    colors: ["Đen", "Trắng", "Xám", "Xanh navy"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.tee,
  },
  polo: {
    materials: "Vải pique cotton pha polyester và spandex, thoáng khí, đứng bề mặt và ít nhăn.",
    fit: "Phom regular fit gọn vừa cơ thể, cổ dệt ổn định, tay áo ôm nhẹ nhưng không bó.",
    suitableFor: "Đi làm, gặp gỡ, đi chơi, du lịch và những dịp cần vẻ ngoài lịch sự vừa phải.",
    care: "Giặt nhẹ ở nhiệt độ tối đa 30°C, cài khuy và lộn trái trước khi giặt. Không vắt xoắn, phơi ngang trong bóng râm, là ở nhiệt độ thấp.",
    highlights: ["Cổ áo giữ dáng", "Thoáng khí", "Lịch sự và dễ mặc"],
    features: [
      { title: "Cấu trúc pique thoáng", description: "Mắt dệt nhỏ tạo khoảng thoáng trên bề mặt, giúp áo dễ chịu hơn khi thời tiết nóng." },
      { title: "Nẹp cổ chắc chắn", description: "Nẹp nút và cổ áo được gia cố để hạn chế bai dão sau nhiều lần mặc." },
      { title: "Phom cân bằng", description: "Độ rộng thân và tay được tính toán để dễ sơ vin hoặc mặc ngoài quần." },
    ],
    colors: ["Xanh navy", "Trắng", "Đen", "Xanh rêu"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.polo,
  },
  shirt: {
    materials: "Cotton pha polyester mật độ dệt cao, bề mặt mịn, thông thoáng và hạn chế nhăn trong ngày.",
    fit: "Phom regular fit, thân áo gọn, vai tự nhiên và độ dài phù hợp để mặc ngoài hoặc sơ vin.",
    suitableFor: "Đi làm, dự họp, gặp gỡ, đi học, dự tiệc nhẹ hoặc phối theo phong cách smart casual.",
    care: "Giặt riêng màu sáng và tối ở nhiệt độ tối đa 30°C. Treo áo ngay sau khi giặt, là mặt trái ở nhiệt độ trung bình và tránh sấy nhiệt cao.",
    highlights: ["Ít nhăn", "Phom gọn hiện đại", "Dễ mặc cả ngày"],
    features: [
      { title: "Cổ áo cân đối", description: "Cổ được dựng vừa phải để giữ vẻ chỉn chu khi cài nút hoặc mở một đến hai nút." },
      { title: "Vải nhẹ và ổn định", description: "Cấu trúc sợi pha giúp bề mặt ít nhàu hơn nhưng vẫn duy trì cảm giác mềm khi tiếp xúc da." },
      { title: "Chi tiết hoàn thiện sạch", description: "Nẹp áo, cổ tay và đường sườn được may đều để sản phẩm giữ hình dáng tốt." },
    ],
    colors: ["Trắng", "Xanh nhạt", "Be", "Xám"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.shirt,
  },
  jacket: {
    materials: "Vải polyester pha cotton có độ bền cao, lớp ngoài cản gió nhẹ và lớp trong mềm, thoáng.",
    fit: "Phom relaxed fit đủ rộng để phối lớp, vai tự nhiên, gấu và tay áo được xử lý gọn.",
    suitableFor: "Di chuyển hằng ngày, đi làm, đi chơi, du lịch và sử dụng trong thời tiết chuyển mùa.",
    care: "Kéo khóa và lộn trái trước khi giặt. Giặt chế độ nhẹ với nước lạnh, không ngâm lâu, không dùng chất tẩy clo và phơi trên móc trong bóng râm.",
    highlights: ["Cản gió nhẹ", "Dễ phối lớp", "Nhiều ngăn tiện dụng"],
    features: [
      { title: "Lớp ngoài bền", description: "Bề mặt vải chịu ma sát tốt và hỗ trợ cản gió nhẹ trong điều kiện sử dụng đô thị." },
      { title: "Kết cấu linh hoạt", description: "Độ rộng thân và tay phù hợp để mặc cùng áo thun, sơ mi hoặc lớp giữ ấm mỏng." },
      { title: "Túi có vị trí hợp lý", description: "Các ngăn túi được bố trí thuận tay để cất vật dụng nhỏ khi di chuyển." },
    ],
    colors: ["Đen", "Xanh navy", "Xám khói", "Be"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.jacket,
  },
  hoodie: {
    materials: "Nỉ cotton pha polyester định lượng trung bình, mặt trong mềm, giữ ấm vừa và ít bai dão.",
    fit: "Phom relaxed fit, vai hạ nhẹ, mũ hai lớp và bo tay co giãn thoải mái.",
    suitableFor: "Mặc hằng ngày, đi học, đi chơi, du lịch hoặc làm lớp giữ ấm trong thời tiết mát.",
    care: "Lộn trái và giặt máy chế độ nhẹ ở 30°C. Không giặt chung với vật có móc khóa sắc, không dùng chất tẩy mạnh và tránh sấy nhiệt cao.",
    highlights: ["Mặt trong mềm", "Giữ ấm vừa phải", "Phom rộng dễ phối"],
    features: [
      { title: "Mũ hai lớp ổn định", description: "Cấu trúc mũ có độ đứng vừa phải, che phủ tốt mà không tạo cảm giác nặng." },
      { title: "Bo tay co giãn", description: "Bo dệt giữ tay áo gọn và hỗ trợ hạn chế gió lùa khi di chuyển." },
      { title: "Nỉ cân bằng nhiệt", description: "Định lượng vải phù hợp khí hậu mát, tạo cảm giác ấm nhưng không quá dày." },
    ],
    colors: ["Xám", "Đen", "Kem", "Xanh navy"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.jacket,
  },
  jeans: {
    materials: "Denim cotton pha elastane, bề mặt bền chắc, co giãn nhẹ và được xử lý mềm.",
    fit: "Phom straight hoặc slim-straight, cạp vừa, ống quần gọn nhưng vẫn đủ khoảng vận động.",
    suitableFor: "Mặc hằng ngày, đi làm, đi học, đi chơi và phối theo phong cách casual hoặc smart casual.",
    care: "Lộn trái trước khi giặt, giặt riêng với màu sáng trong những lần đầu. Dùng nước lạnh, hạn chế giặt quá thường xuyên và phơi trong bóng râm.",
    highlights: ["Denim bền màu", "Co giãn nhẹ", "Phom ống hiện đại"],
    features: [
      { title: "Denim có độ đàn hồi", description: "Sợi elastane giúp quần dễ chịu hơn khi ngồi, bước đi hoặc di chuyển trong ngày." },
      { title: "Kết cấu năm túi", description: "Thiết kế túi cơ bản được căn chỉnh để sử dụng thuận tiện và cân đối mặt sau." },
      { title: "Đường may chịu lực", description: "Các vị trí cạp, đáy và túi được gia cố để phù hợp tần suất sử dụng thường xuyên." },
    ],
    colors: ["Xanh đậm", "Xanh nhạt", "Đen", "Xám"],
    sizes: ["28", "29", "30", "31", "32", "33", "34", "36"],
    images: imageSets.jeans,
  },
  trousers: {
    materials: "Cotton pha polyester và spandex, mặt vải mịn, giữ nếp vừa phải và co giãn theo chuyển động.",
    fit: "Phom straight-tapered, cạp vừa, phần đùi thoải mái và ống thu gọn nhẹ.",
    suitableFor: "Đi làm, đi học, gặp gỡ, đi chơi hoặc sử dụng trong các lịch trình cần sự gọn gàng.",
    care: "Giặt ở nhiệt độ tối đa 30°C với màu tương tự. Không dùng chất tẩy clo, tránh sấy nhiệt cao và là ở nhiệt độ thấp đến trung bình.",
    highlights: ["Co giãn linh hoạt", "Ít nhăn", "Phom gọn dễ phối"],
    features: [
      { title: "Cạp quần ổn định", description: "Cấu trúc cạp giữ quần ngồi đúng vị trí và tạo cảm giác dễ chịu trong nhiều tư thế." },
      { title: "Vải giữ nếp vừa", description: "Tỷ lệ sợi pha giúp bề mặt gọn hơn sau thời gian dài ngồi hoặc di chuyển." },
      { title: "Túi thực dụng", description: "Độ sâu túi phù hợp để mang theo điện thoại và vật dụng nhỏ hằng ngày." },
    ],
    colors: ["Đen", "Be", "Xám", "Xanh navy"],
    sizes: ["28", "29", "30", "31", "32", "33", "34", "36"],
    images: imageSets.trousers,
  },
  shorts: {
    materials: "Cotton pha polyester và spandex, nhẹ, thoáng, có độ co giãn và nhanh khô vừa phải.",
    fit: "Phom regular fit trên gối, cạp ngồi ổn định và ống quần đủ rộng cho chuyển động.",
    suitableFor: "Đi chơi, du lịch, mặc hằng ngày, vận động nhẹ và các hoạt động ngoài trời.",
    care: "Giặt máy chế độ nhẹ ở 30°C, giặt cùng màu tương tự, không dùng chất tẩy mạnh và phơi trong bóng râm.",
    highlights: ["Nhẹ và thoáng", "Vận động linh hoạt", "Túi sâu tiện dụng"],
    features: [
      { title: "Độ dài cân đối", description: "Chiều dài trên gối tạo cảm giác gọn và thuận tiện cho các hoạt động thường ngày." },
      { title: "Cạp dễ điều chỉnh", description: "Cấu trúc cạp và dây rút hỗ trợ điều chỉnh độ ôm theo cơ thể." },
      { title: "Bề mặt nhanh ráo", description: "Vải pha hạn chế giữ ẩm lâu, phù hợp điều kiện thời tiết nóng." },
    ],
    colors: ["Đen", "Xanh navy", "Be", "Xám"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.shorts,
  },
  sport: {
    materials: "Polyester kỹ thuật pha spandex, co giãn đa chiều, thoát ẩm nhanh và nhẹ trên cơ thể.",
    fit: "Phom thể thao ôm vừa, đường cắt hỗ trợ biên độ chuyển động và hạn chế vướng khi tập.",
    suitableFor: "Chạy bộ, tập gym, yoga, đạp xe, đi bộ nhanh và các hoạt động vận động hằng ngày.",
    care: "Giặt ngay sau khi tập bằng nước lạnh hoặc tối đa 30°C. Không dùng nước xả quá nhiều, không ủi trực tiếp lên bề mặt và phơi nơi thoáng mát.",
    highlights: ["Thoát ẩm nhanh", "Co giãn đa chiều", "Nhẹ khi vận động"],
    features: [
      { title: "Quản lý độ ẩm", description: "Cấu trúc sợi hỗ trợ đưa mồ hôi ra bề mặt để vải khô nhanh hơn trong lúc vận động." },
      { title: "Co giãn linh hoạt", description: "Vải đàn hồi theo nhiều hướng, hỗ trợ các động tác có biên độ lớn." },
      { title: "Đường may giảm cấn", description: "Các đường ráp chính được bố trí để hạn chế ma sát tại vùng vận động nhiều." },
    ],
    colors: ["Đen", "Xám", "Xanh navy", "Xanh rêu"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.sport,
  },
  swim: {
    materials: "Polyamide pha elastane chuyên dụng, co giãn tốt, nhanh khô và chịu clo ở mức sử dụng thông thường.",
    fit: "Phom ôm hỗ trợ vận động dưới nước, các mép được xử lý gọn để hạn chế xô lệch.",
    suitableFor: "Bơi hồ, đi biển, nghỉ dưỡng và các hoạt động dưới nước.",
    care: "Xả sạch bằng nước mát ngay sau khi sử dụng. Giặt tay nhẹ, không vắt xoắn, không ngâm lâu trong chất tẩy và phơi phẳng trong bóng râm.",
    highlights: ["Nhanh khô", "Co giãn tốt", "Ổn định khi xuống nước"],
    features: [
      { title: "Vải chuyên dụng dưới nước", description: "Sợi vải có độ đàn hồi và bề mặt trơn giúp sản phẩm nhẹ hơn khi tiếp xúc nước." },
      { title: "Đường may chắc", description: "Các vị trí chịu lực được gia cố để duy trì độ ổn định trong quá trình bơi." },
      { title: "Phục hồi phom tốt", description: "Vật liệu có khả năng trở lại hình dáng ban đầu sau khi kéo giãn trong giới hạn sử dụng." },
    ],
    colors: ["Đen", "Xanh navy", "Xanh cobalt", "Đỏ đô"],
    sizes: ["S", "M", "L", "XL"],
    images: imageSets.swim,
  },
  home: {
    materials: "Cotton modal pha spandex, mềm, thoáng và có độ rủ tự nhiên.",
    fit: "Phom rộng thoải mái, đường may gọn và không tạo cảm giác bó khi nghỉ ngơi.",
    suitableFor: "Mặc tại nhà, ngủ, thư giãn cuối tuần và các hoạt động nhẹ trong không gian riêng.",
    care: "Giặt máy chế độ nhẹ ở 30°C, sử dụng túi giặt nếu có, không ngâm lâu và phơi trong bóng râm để giữ độ mềm.",
    highlights: ["Mềm mát trên da", "Phom thư giãn", "Co giãn nhẹ"],
    features: [
      { title: "Bề mặt dịu da", description: "Sợi modal tạo cảm giác mịn và thoáng, phù hợp mặc trong thời gian dài." },
      { title: "Thiết kế không gò bó", description: "Độ rộng được cân đối để nằm, ngồi và vận động nhẹ thoải mái." },
      { title: "Đường may phẳng gọn", description: "Các đường ráp được hoàn thiện gọn nhằm hạn chế cộm khi tiếp xúc cơ thể." },
    ],
    colors: ["Kem", "Hồng nhạt", "Xám", "Xanh nhạt"],
    sizes: ["S", "M", "L", "XL"],
    images: imageSets.home,
  },
  underwear: {
    materials: "Cotton pha modal và elastane, mềm, thoáng, co giãn tốt và phù hợp tiếp xúc trực tiếp với da.",
    fit: "Phom ôm vừa cơ thể, cạp đàn hồi ổn định và các mép được xử lý êm.",
    suitableFor: "Sử dụng hằng ngày, đi làm, di chuyển và vận động nhẹ.",
    care: "Giặt riêng bằng túi giặt hoặc giặt tay nhẹ ở 30°C. Không dùng chất tẩy mạnh, không sấy nóng và phơi nơi thông thoáng.",
    highlights: ["Mềm thoáng", "Cạp co giãn êm", "Ôm vừa cơ thể"],
    features: [
      { title: "Vải tiếp xúc mềm", description: "Thành phần cotton và modal giúp bề mặt dễ chịu khi mặc suốt ngày." },
      { title: "Độ đàn hồi ổn định", description: "Sợi elastane hỗ trợ sản phẩm ôm theo cơ thể mà không gây bó quá mức." },
      { title: "Đường may hạn chế cộm", description: "Mép và đường ráp được xử lý gọn để giảm ma sát tại vùng nhạy cảm." },
    ],
    colors: ["Đen", "Xám", "Be", "Xanh navy"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: imageSets.underwear,
  },
  accessories: {
    materials: "Vật liệu được lựa chọn theo công năng gồm cotton, polyester hoặc nylon bền nhẹ; chi tiết kim loại có lớp hoàn thiện chống oxy hóa thông thường.",
    fit: "Kích thước tiêu chuẩn, dễ điều chỉnh hoặc phù hợp nhiều dáng người tùy loại phụ kiện.",
    suitableFor: "Hoàn thiện trang phục hằng ngày, đi làm, đi chơi, du lịch và mang theo vật dụng cá nhân.",
    care: "Lau sạch bằng khăn mềm ẩm sau khi sử dụng. Không ngâm lâu trong nước, tránh nguồn nhiệt cao và bảo quản nơi khô thoáng.",
    highlights: ["Thiết kế tối giản", "Nhẹ và tiện dụng", "Dễ phối trang phục"],
    features: [
      { title: "Công năng rõ ràng", description: "Kích thước và chi tiết được bố trí để đáp ứng nhu cầu sử dụng hằng ngày." },
      { title: "Vật liệu bền nhẹ", description: "Chất liệu ưu tiên độ bền, trọng lượng hợp lý và dễ vệ sinh." },
      { title: "Ngôn ngữ thiết kế tối giản", description: "Màu sắc trung tính giúp phụ kiện kết hợp thuận tiện với nhiều trang phục." },
    ],
    colors: ["Đen", "Xám", "Be", "Xanh navy"],
    sizes: ["Freesize"],
    images: imageSets.accessories,
  },
  shoes: {
    materials: "Thân giày bằng vải dệt hoặc da tổng hợp, lớp lót thoáng; đế cao su có độ bám và đàn hồi phù hợp đi hằng ngày.",
    fit: "Phom tiêu chuẩn, mũi có khoảng trống vừa, cổ và lưỡi giày có đệm hỗ trợ.",
    suitableFor: "Đi làm, đi học, đi chơi, du lịch, đi bộ và phối trang phục hằng ngày.",
    care: "Lau bề mặt bằng khăn ẩm và bàn chải mềm. Không ngâm toàn bộ sản phẩm, tránh phơi nắng gắt và để khô tự nhiên ở nơi thoáng.",
    highlights: ["Đế bám ổn định", "Lót êm", "Phối đồ linh hoạt"],
    features: [
      { title: "Đế cao su linh hoạt", description: "Các rãnh đế hỗ trợ độ bám trên bề mặt khô và khả năng uốn theo bước chân." },
      { title: "Lớp lót dễ chịu", description: "Đệm lót có độ êm vừa phải, phù hợp nhu cầu di chuyển thường ngày." },
      { title: "Thân giày ổn định", description: "Cấu trúc thân giữ bàn chân gọn nhưng vẫn đảm bảo khoảng cử động cần thiết." },
    ],
    colors: ["Trắng", "Đen", "Be", "Xám"],
    sizes: ["36", "37", "38", "39", "40", "41", "42", "43"],
    images: imageSets.shoes,
  },
  leggings: {
    materials: "Polyamide pha elastane định lượng cao, co giãn bốn chiều, bề mặt mịn và thoát ẩm nhanh.",
    fit: "Phom ôm sát, cạp cao bản rộng nâng đỡ vùng bụng và đường cắt theo chuyển động cơ thể.",
    suitableFor: "Yoga, pilates, tập gym, đi bộ, chạy nhẹ và phối athleisure hằng ngày.",
    care: "Giặt máy chế độ nhẹ bằng túi giặt ở 30°C. Không dùng nước xả đậm đặc, không ủi, tránh bề mặt nhám và phơi trong bóng râm.",
    highlights: ["Co giãn bốn chiều", "Cạp cao nâng đỡ", "Hạn chế lộ khi vận động"],
    features: [
      { title: "Cạp cao bản rộng", description: "Cấu trúc cạp ôm ổn định vùng bụng và hạn chế cuộn khi thực hiện động tác gập." },
      { title: "Vải đàn hồi đa chiều", description: "Sợi co giãn hỗ trợ biên độ chuyển động lớn trong yoga, gym và sinh hoạt." },
      { title: "Đường ráp theo cơ thể", description: "Các đường may được bố trí để hỗ trợ phom và giảm cấn tại vùng vận động nhiều." },
    ],
    colors: ["Đen", "Xám than", "Nâu cacao", "Xanh rêu"],
    sizes: ["XS", "S", "M", "L", "XL"],
    images: imageSets.women,
  },
  skirt: {
    materials: "Polyester pha rayon và spandex, bề mặt mịn, có độ rủ và giữ phom vừa phải.",
    fit: "Cạp vừa, phom chữ A hoặc suông nhẹ, chiều dài cân đối để dễ di chuyển.",
    suitableFor: "Đi làm, đi học, gặp gỡ, đi chơi và các dịp cần phong cách nữ tính, gọn gàng.",
    care: "Giặt nhẹ ở 30°C, sử dụng túi giặt, không vắt xoắn và treo hoặc phơi phẳng trong bóng râm.",
    highlights: ["Độ rủ tự nhiên", "Dễ phối áo", "Di chuyển thoải mái"],
    features: [
      { title: "Cạp gọn và ổn định", description: "Cấu trúc cạp giúp sản phẩm nằm đúng vị trí mà không gây bó quá mức." },
      { title: "Phom tạo chuyển động", description: "Độ xòe hoặc rủ được cân chỉnh để vạt váy chuyển động tự nhiên khi bước đi." },
      { title: "Lớp trong kín đáo", description: "Các mẫu cần thiết được bổ sung lớp lót phù hợp để tăng sự tự tin khi mặc." },
    ],
    colors: ["Đen", "Be", "Xám", "Nâu"],
    sizes: ["XS", "S", "M", "L", "XL"],
    images: imageSets.women,
  },
  dress: {
    materials: "Rayon pha polyester và spandex, bề mặt mềm, độ rủ tự nhiên và ít nhăn hơn vải rayon thuần.",
    fit: "Phom tôn dáng vừa phải, phần eo được xử lý cân đối và chừa khoảng vận động cần thiết.",
    suitableFor: "Đi làm, đi chơi, hẹn gặp, du lịch và các buổi tiệc nhẹ.",
    care: "Giặt tay hoặc giặt máy chế độ nhẹ trong túi giặt ở 30°C. Không vắt xoắn, treo trên móc phù hợp và là hơi ở nhiệt độ thấp.",
    highlights: ["Độ rủ mềm", "Phom tôn dáng", "Mặc được nhiều dịp"],
    features: [
      { title: "Tỷ lệ phom cân đối", description: "Vai, eo và chiều dài được tính toán để tạo dáng thanh thoát mà vẫn thoải mái." },
      { title: "Chất vải chuyển động đẹp", description: "Độ rủ của vật liệu giúp thân váy chuyển động mềm khi người mặc bước đi." },
      { title: "Chi tiết kín đáo", description: "Vị trí cổ, nách và đường xẻ được xử lý để phù hợp nhiều hoàn cảnh sử dụng." },
    ],
    colors: ["Đen", "Kem", "Xanh navy", "Đỏ đô"],
    sizes: ["XS", "S", "M", "L", "XL"],
    images: imageSets.women,
  },
  blouse: {
    materials: "Rayon hoặc polyester pha spandex, nhẹ, rủ mềm và ít nhăn trong quá trình sử dụng.",
    fit: "Phom suông nữ tính, vai tự nhiên, thân áo có độ rủ và khoảng thoải mái hợp lý.",
    suitableFor: "Đi làm, đi học, đi chơi, hẹn gặp và phối cùng quần hoặc chân váy.",
    care: "Giặt bằng túi giặt ở chế độ nhẹ, nước tối đa 30°C. Không vắt xoắn, phơi trên móc trong bóng râm và là hơi nhẹ.",
    highlights: ["Rủ mềm nữ tính", "Nhẹ thoáng", "Dễ phối công sở"],
    features: [
      { title: "Bề mặt mềm và rủ", description: "Vật liệu tạo đường rơi tự nhiên, giúp áo giữ vẻ nhẹ nhàng khi chuyển động." },
      { title: "Chi tiết cổ tinh gọn", description: "Thiết kế cổ và nẹp được cân đối để dễ phối trong nhiều hoàn cảnh." },
      { title: "Phom thoải mái", description: "Thân áo không ôm sát, tạo khoảng thoáng nhưng vẫn giữ tổng thể gọn." },
    ],
    colors: ["Trắng kem", "Đen", "Hồng nhạt", "Xanh nhạt"],
    sizes: ["XS", "S", "M", "L", "XL"],
    images: imageSets.women,
  },
};

function selectProfile(slug) {
  if (slug.includes("legging")) return profiles.leggings;
  if (slug.includes("chan-vay")) return profiles.skirt;
  if (slug.includes("vay-dam")) return profiles.dress;
  if (slug.includes("blouse")) return profiles.blouse;
  if (slug.includes("polo")) return profiles.polo;
  if (slug.includes("so-mi")) return profiles.shirt;
  if (slug.includes("khoac")) return profiles.jacket;
  if (slug.includes("hoodie") || slug.includes("ao-ni")) return profiles.hoodie;
  if (slug.includes("jeans")) return profiles.jeans;
  if (slug.includes("kaki") || slug.includes("jogger") || slug === "quan-dai") return profiles.trousers;
  if (slug.includes("short")) return profiles.shorts;
  if (slug.includes("the-thao")) return profiles.sport;
  if (slug.includes("boi")) return profiles.swim;
  if (slug.includes("mac-nha")) return profiles.home;
  if (slug.includes("do-lot")) return profiles.underwear;
  if (slug.includes("phu-kien")) return profiles.accessories;
  if (slug.includes("giay-dep")) return profiles.shoes;
  return profiles.tee;
}

function buildPayload(product, category) {
  const profile = selectProfile(category.slug);
  const audience = category.audience || product.audience || "unisex";
  const modelInfo = audience === "women"
    ? "Người mẫu cao 168 cm, số đo tham khảo 82–62–90 cm và mặc size S. Số đo có thể chênh lệch nhẹ tùy phom sản phẩm."
    : audience === "men"
      ? "Người mẫu cao 180 cm, nặng 72 kg, vòng ngực 96 cm và mặc size L. Số đo có thể chênh lệch nhẹ tùy phom sản phẩm."
      : "Người mẫu nam cao 180 cm mặc size L; người mẫu nữ cao 168 cm mặc size S. Vui lòng đối chiếu bảng size trước khi chọn.";
  const currentImages = [product.image, ...(product.images || []), ...profile.images].filter(Boolean);
  const images = [...new Set(currentImages)].slice(0, 4);
  const longDescription = `${product.name} thuộc danh mục ${category.name}, được phát triển cho nhịp sống hằng ngày với sự cân bằng giữa thẩm mỹ tối giản, cảm giác mặc thoải mái và tính ứng dụng. ${profile.fit} ${profile.materials} Sản phẩm phù hợp để ${profile.suitableFor.toLocaleLowerCase("vi-VN")} Các chi tiết chính được hoàn thiện theo hướng gọn, dễ phối và thuận tiện chăm sóc để người mặc có thể sử dụng thường xuyên trong nhiều lịch trình.`;
  return {
    ...product,
    description: `${product.name} có ${profile.fit.toLocaleLowerCase("vi-VN")} Chất liệu ${profile.materials.toLocaleLowerCase("vi-VN")}`,
    longDescription,
    materials: profile.materials,
    care: profile.care,
    fit: profile.fit,
    suitableFor: profile.suitableFor,
    modelInfo,
    origin: "Thiết kế tại Việt Nam, sản xuất tại Việt Nam.",
    highlights: profile.highlights,
    featureDetails: profile.features,
    colors: product.colors?.length ? product.colors : profile.colors,
    sizes: product.sizes?.length ? product.sizes : profile.sizes,
    image: images[0],
    images,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${payload.message || path}`);
  return payload;
}

async function main() {
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@novawear.vn", password: "Admin@123", portal: "admin" }),
  });
  const [productResult, categoryResult] = await Promise.all([
    request("/admin/products", { token: login.token }),
    request("/admin/categories", { token: login.token }),
  ]);
  const categoryById = new Map(categoryResult.data.map((category) => [category.id, category]));
  let updated = 0;

  for (const product of productResult.data) {
    const category = categoryById.get(product.categoryId);
    if (!category) continue;
    const payload = buildPayload(product, category);
    await request(`/admin/products/${product.id}`, {
      method: "PUT",
      token: login.token,
      body: JSON.stringify(payload),
    });
    updated += 1;
    if (updated % 25 === 0) process.stdout.write(`Đã cập nhật ${updated}/${productResult.data.length}\n`);
  }

  process.stdout.write(`Hoàn tất ${updated} sản phẩm thuộc ${categoryResult.data.length} danh mục.\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildPayload, selectProfile };
