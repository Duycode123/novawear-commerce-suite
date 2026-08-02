const IMAGE_COPY_VERSION = 1;

const PROFILES = {
  duffle: {
    materials: "Vải dệt dày, lót trong nhẹ, quai xách bản rộng và khóa kéo hai chiều.",
    care: "Lau sạch bằng khăn ẩm, để khô tự nhiên và không ngâm hoặc giặt máy.",
    fit: "Dáng trống nhỏ gọn, khoang chính rộng và hai đầu túi giữ phom ổn định.",
    suitableFor: "Tập luyện, đi làm, du lịch ngắn ngày và mang đồ cá nhân.",
    highlights: ["Khoang chính rộng", "Quai xách bản rộng", "Dáng trống gọn"],
  },
  sportSocks: {
    materials: "Sợi dệt co giãn, thân tất thoáng và vùng gót mũi được dệt dày hơn.",
    care: "Giặt nhẹ bằng nước mát, không tẩy và phơi trong bóng râm.",
    fit: "Ống tất cao ôm bắp chân, bo miệng giữ ổn định khi vận động.",
    suitableFor: "Bóng đá, chạy bộ, tập luyện và hoạt động thể thao ngoài trời.",
    highlights: ["Ống cao ôm chân", "Gót mũi gia cố", "Co giãn ổn định"],
  },
  gripSocks: {
    materials: "Sợi dệt co giãn với vùng thông khí và cấu trúc tăng độ bám quanh bàn chân.",
    care: "Lộn trái, giặt nhẹ bằng nước mát và không sấy ở nhiệt độ cao.",
    fit: "Dáng tất thể thao ôm gọn, cổ trung và không tạo phần vải thừa trong giày.",
    suitableFor: "Bóng đá, futsal và các môn cần độ ổn định bàn chân.",
    highlights: ["Dệt tăng độ bám", "Vùng thoáng khí", "Ôm gọn trong giày"],
  },
  backpack: {
    materials: "Vải dệt bền, các ngăn có khóa kéo và quai đeo vai đệm mềm.",
    care: "Lau bằng khăn ẩm, làm sạch riêng từng vết bẩn và phơi khô tự nhiên.",
    fit: "Dáng balo thể thao nhiều ngăn, thân đứng và quai đeo có thể điều chỉnh.",
    suitableFor: "Đi học, tập luyện, thi đấu và chuyến đi ngắn.",
    highlights: ["Nhiều ngăn khóa kéo", "Quai vai có đệm", "Thân túi đứng phom"],
  },
  hoodiePullover: {
    materials: "Vải nỉ dày vừa, bề mặt mềm và bo dệt đàn hồi tại tay áo, gấu áo.",
    care: "Lộn trái, giặt máy chế độ nhẹ bằng nước mát và phơi trong bóng râm.",
    fit: "Phom oversized hoặc relaxed, vai hạ và thân áo rộng để mặc nhiều lớp.",
    suitableFor: "Đi học, dạo phố, di chuyển và mặc hằng ngày trong thời tiết mát.",
    highlights: ["Phom rộng dễ mặc", "Mũ áo có dây rút", "Bo tay đàn hồi"],
  },
  hoodieZip: {
    materials: "Vải nỉ dày vừa, khóa kéo toàn thân và bo dệt đàn hồi ở tay, gấu áo.",
    care: "Đóng khóa trước khi giặt, giặt lạnh ở chế độ nhẹ và không sấy nóng.",
    fit: "Phom relaxed, khóa kéo tiện mặc nhiều lớp và mũ áo có độ phủ cân đối.",
    suitableFor: "Đi học, dạo phố, di chuyển và mặc ngoài áo thun.",
    highlights: ["Khóa kéo toàn thân", "Phom relaxed", "Túi trước tiện dụng"],
  },
  denim: {
    materials: "Denim cotton dày vừa, bề mặt wash tự nhiên và đường may chịu lực.",
    care: "Lộn trái, giặt riêng bằng nước mát và hạn chế giặt quá thường xuyên để giữ màu.",
    fit: "Cạp vừa, phần đùi có khoảng cử động và ống quần rơi theo đúng dáng mô tả.",
    suitableFor: "Đi làm, đi học, dạo phố và phối cùng áo thun, polo hoặc sơ mi.",
    highlights: ["Denim dày vừa", "Wash tự nhiên", "Đường may chịu lực"],
  },
  sweatJogger: {
    materials: "Vải nỉ hoặc jersey dày vừa, cạp thun có dây rút và bề mặt mềm.",
    care: "Giặt máy chế độ nhẹ bằng nước mát, không tẩy và tránh sấy nóng.",
    fit: "Phom jogger thoải mái ở đùi, ống thu gọn và cạp co giãn.",
    suitableFor: "Mặc hằng ngày, tập nhẹ, di chuyển và thư giãn cuối tuần.",
    highlights: ["Cạp dây rút", "Phom jogger gọn", "Bề mặt mềm"],
  },
  techJogger: {
    materials: "Vải dệt trơn nhẹ, cạp thun co giãn và bề mặt ít bám bụi.",
    care: "Giặt lạnh, không dùng chất tẩy mạnh và phơi trong bóng râm.",
    fit: "Dáng pull-on thoải mái, ống quần gọn và túi hai bên tiện dụng.",
    suitableFor: "Di chuyển, đi chơi, tập nhẹ và mặc trong ngày năng động.",
    highlights: ["Vải nhẹ", "Cạp thun linh hoạt", "Túi hai bên"],
  },
  chino: {
    materials: "Vải kaki dệt chéo dày vừa, bề mặt lì và khóa kéo kim loại chắc chắn.",
    care: "Giặt cùng màu bằng nước mát, phơi ngay sau khi giặt và ủi ở nhiệt độ vừa.",
    fit: "Cạp vừa, thân quần gọn và ống thẳng hoặc thu nhẹ theo từng mẫu.",
    suitableFor: "Đi làm, gặp gỡ và phối theo phong cách smart-casual.",
    highlights: ["Vải kaki đứng phom", "Khóa kéo chắc chắn", "Dễ phối công sở"],
  },
  rashguard: {
    materials: "Vải bơi co giãn, bề mặt trơn và cấu trúc ôm cơ thể để giảm cản nước.",
    care: "Xả bằng nước sạch ngay sau khi sử dụng, giặt tay nhẹ và phơi trong bóng râm.",
    fit: "Phom ôm thể thao, tay dài tăng độ che phủ và các mảng phối hỗ trợ vận động.",
    suitableFor: "Bơi hồ, đi biển, lặn nông và hoạt động dưới nước.",
    highlights: ["Co giãn khi bơi", "Tay dài che phủ", "Phom ôm thể thao"],
  },
  polo: {
    materials: "Vải dệt bề mặt mịn, cổ và bo tay phối viền tương phản.",
    care: "Cài khuy, lộn trái và giặt nhẹ bằng nước mát; không sấy ở nhiệt độ cao.",
    fit: "Phom regular gọn vai, tay ngắn và chiều dài cân đối để mặc ngoài hoặc sơ vin.",
    suitableFor: "Đi làm, gặp gỡ, dạo phố và phong cách smart-casual.",
    highlights: ["Cổ phối viền", "Phom regular", "Dễ phối trang phục"],
  },
  casualSneaker: {
    materials: "Thân giày phối da tổng hợp và vải, lót êm cùng đế cao su nhiều lớp.",
    care: "Lau bằng khăn ẩm, vệ sinh riêng dây giày và tránh ngâm cả đôi trong nước.",
    fit: "Dáng sneaker cổ thấp, mũi tròn và đế bằng phù hợp sử dụng hằng ngày.",
    suitableFor: "Đi học, dạo phố, du lịch và phối trang phục thường ngày.",
    highlights: ["Phối màu nhiều lớp", "Đế cao su", "Dáng cổ thấp"],
  },
  runningShoe: {
    materials: "Thân lưới dệt thoáng, các mảng gia cố và đế đệm dày hỗ trợ tiếp đất.",
    care: "Chải khô bụi bẩn, lau bằng khăn ẩm và để giày khô tự nhiên.",
    fit: "Dáng giày chạy ôm gót, mũi có khoảng cử động và dây buộc điều chỉnh.",
    suitableFor: "Đi bộ, chạy nhẹ, tập luyện và di chuyển hằng ngày.",
    highlights: ["Thân lưới thoáng", "Đế đệm dày", "Ôm gót ổn định"],
  },
  tailoredShort: {
    materials: "Vải dệt đứng phom, cạp có đỉa thắt lưng và đường may gọn.",
    care: "Giặt cùng màu bằng nước mát, phơi trên móc và ủi ở nhiệt độ vừa.",
    fit: "Ống short suông, dài trên gối và cạp vừa tạo vẻ ngoài chỉn chu.",
    suitableFor: "Đi chơi, du lịch và phong cách smart-casual mùa nóng.",
    highlights: ["Cạp có đỉa", "Ống suông", "Phom chỉn chu"],
  },
  loungeShort: {
    materials: "Vải dệt mềm nhẹ, cạp thun có dây rút và túi hai bên.",
    care: "Giặt lạnh ở chế độ nhẹ, không tẩy và phơi trong bóng râm.",
    fit: "Phom relaxed, ống rộng vừa và cạp co giãn không gây siết.",
    suitableFor: "Mặc hằng ngày, nghỉ ngơi, đi chơi và du lịch.",
    highlights: ["Cạp dây rút", "Vải mềm nhẹ", "Ống rộng thoải mái"],
  },
  underwear: {
    materials: "Vải dệt mềm co giãn, cạp đàn hồi và đường may gọn tại vùng tiếp xúc da.",
    care: "Giặt riêng bằng nước mát, không tẩy và không sấy ở nhiệt độ cao.",
    fit: "Dáng trunk hoặc boxer ôm vừa, ống ngắn và cạp nằm ổn định.",
    suitableFor: "Mặc nền hằng ngày, đi làm và vận động nhẹ.",
    highlights: ["Cạp co giãn êm", "Phom ôm vừa", "Đường may gọn"],
  },
  pajamasLong: {
    materials: "Vải dệt mềm nhẹ, bề mặt in họa tiết và viền áo hoàn thiện gọn.",
    care: "Giặt riêng bằng nước mát, lộn trái và phơi trong bóng râm để giữ họa tiết.",
    fit: "Bộ áo tay dài và quần dài phom relaxed, cạp mềm để nghỉ ngơi thoải mái.",
    suitableFor: "Mặc tại nhà, ngủ, nghỉ ngơi và mang theo chuyến đi.",
    highlights: ["Bộ dài tay", "Họa tiết đồng bộ", "Phom relaxed"],
  },
  pajamasShort: {
    materials: "Vải dệt mềm nhẹ, bề mặt in họa tiết và cạp quần co giãn.",
    care: "Giặt riêng bằng nước mát, lộn trái và tránh sấy nóng.",
    fit: "Bộ áo ngắn tay và quần short rộng vừa, ưu tiên cảm giác thoáng.",
    suitableFor: "Mặc tại nhà, ngủ và nghỉ ngơi trong thời tiết ấm.",
    highlights: ["Bộ ngắn thoáng", "Cạp co giãn", "Họa tiết đồng bộ"],
  },
  homeCami: {
    materials: "Vải dệt mềm mát, phối ren trang trí và dây vai mảnh.",
    care: "Giặt tay hoặc dùng túi giặt bằng nước mát, không vắt xoắn.",
    fit: "Áo hai dây và quần short rộng nhẹ, phần thân không ôm sát.",
    suitableFor: "Mặc tại nhà, ngủ và nghỉ ngơi.",
    highlights: ["Phối ren mềm", "Dáng hai dây", "Bộ short thoáng"],
  },
  maxiSkirt: {
    materials: "Vải dệt nhẹ có độ rủ, thân váy chia tầng và cạp gọn.",
    care: "Giặt nhẹ trong túi giặt, không vắt xoắn và treo phơi trong bóng râm.",
    fit: "Dáng maxi xòe nhiều tầng, chuyển động mềm và dài gần mắt cá.",
    suitableFor: "Dạo phố, du lịch, đi làm và phối phong cách nữ tính.",
    highlights: ["Dáng maxi nhiều tầng", "Vải rủ nhẹ", "Chuyển động mềm"],
  },
  miniSkirt: {
    materials: "Vải dệt co giãn nhẹ, cạp gọn và bề mặt trơn dễ phối.",
    care: "Giặt nhẹ bằng nước mát, không tẩy và phơi trong bóng râm.",
    fit: "Dáng mini ôm vừa hoặc chữ A, chiều dài trên gối.",
    suitableFor: "Dạo phố, đi chơi và phối theo phong cách trẻ trung.",
    highlights: ["Dáng mini", "Cạp gọn", "Dễ phối áo ngắn"],
  },
  skort: {
    materials: "Vải dệt đứng vừa, thân ngoài xếp ly và lớp quần trong tiện vận động.",
    care: "Giặt nhẹ bằng nước mát, treo phơi và ủi nếp ở nhiệt độ thấp.",
    fit: "Dáng váy ngắn xếp ly, cạp vừa và có lớp quần bảo vệ bên trong.",
    suitableFor: "Đi chơi, dạo phố, hoạt động nhẹ và phối phong cách năng động.",
    highlights: ["Có quần trong", "Xếp ly gọn", "Dễ vận động"],
  },
  sweatshirt: {
    materials: "Vải nỉ mềm, bề mặt mịn và bo tay đàn hồi.",
    care: "Lộn trái, giặt lạnh ở chế độ nhẹ và phơi trong bóng râm.",
    fit: "Dáng cropped hoặc relaxed, thân rộng vừa và tay áo thoải mái.",
    suitableFor: "Đi học, dạo phố và phối cùng chân váy hoặc quần cạp cao.",
    highlights: ["Vải nỉ mềm", "Phom trẻ trung", "Tay áo thoải mái"],
  },
  utilityJacket: {
    materials: "Vải dệt cản gió nhẹ, mũ liền và các chi tiết khóa kéo tiện dụng.",
    care: "Đóng khóa trước khi giặt, giặt lạnh và không sấy nóng.",
    fit: "Phom oversized có độ phủ, mũ rộng và thân áo đủ mặc nhiều lớp.",
    suitableFor: "Di chuyển, dạo phố và thời tiết thay đổi.",
    highlights: ["Mũ liền thân", "Phom phủ rộng", "Cản gió nhẹ"],
  },
  shirt: {
    materials: "Vải dệt nhẹ, bề mặt mịn và hàng khuy trước hoàn thiện gọn.",
    care: "Giặt nhẹ bằng nước mát, treo phơi ngay và ủi ở nhiệt độ thấp đến vừa.",
    fit: "Phom regular hoặc relaxed, vai tự nhiên và vạt áo dễ sơ vin.",
    suitableFor: "Đi làm, đi học, gặp gỡ và phối trang phục hằng ngày.",
    highlights: ["Hàng khuy gọn", "Vải nhẹ", "Dễ sơ vin"],
  },
  sportSet: {
    materials: "Vải thể thao dệt nhẹ, bề mặt thoáng và có độ co giãn khi vận động.",
    care: "Giặt ngay sau khi tập bằng nước mát, không dùng nước xả đậm đặc và không sấy nóng.",
    fit: "Bộ áo và quần hoặc skort đồng bộ, phom linh hoạt và không cản chuyển động.",
    suitableFor: "Chạy nhẹ, gym, cầu lông, đi bộ và mặc athleisure.",
    highlights: ["Bộ đồng màu", "Thoáng khi vận động", "Phom linh hoạt"],
  },
  swimsuit: {
    materials: "Vải bơi co giãn, bề mặt trơn và có lớp lót tại vị trí cần thiết.",
    care: "Xả nước sạch sau khi bơi, giặt tay nhẹ và phơi trong bóng râm.",
    fit: "Phom liền thân hoặc bộ bơi ôm vừa, ưu tiên độ che phủ và chuyển động.",
    suitableFor: "Bơi hồ, đi biển và hoạt động dưới nước.",
    highlights: ["Co giãn khi bơi", "Lớp lót phù hợp", "Phom ôm ổn định"],
  },
  womenTee: {
    materials: "Vải dệt kim mềm, có độ co giãn nhẹ và bề mặt mịn.",
    care: "Lộn trái, giặt máy chế độ nhẹ bằng nước mát và phơi trong bóng râm.",
    fit: "Phom ôm vừa hoặc cropped theo từng mẫu, tay ngắn và vai gọn.",
    suitableFor: "Đi học, dạo phố, mặc hằng ngày và phối cùng quần hoặc chân váy.",
    highlights: ["Vải dệt kim mềm", "Phom nữ tính", "Dễ phối hằng ngày"],
  },
  blouse: {
    materials: "Vải dệt nhẹ có độ rủ, bề mặt mềm và chi tiết cổ hoặc tay tạo điểm nhấn.",
    care: "Giặt nhẹ trong túi giặt bằng nước mát, không vắt xoắn và ủi hơi ở nhiệt độ thấp.",
    fit: "Phom nữ tính, thân áo có độ rủ và đủ khoảng cử động ở vai, tay.",
    suitableFor: "Đi làm, gặp gỡ, dạo phố và dự tiệc nhẹ.",
    highlights: ["Vải rủ nhẹ", "Chi tiết cổ tay nổi bật", "Dễ phối công sở"],
  },
  lingerie: {
    materials: "Vải co giãn mềm phối ren, dây vai điều chỉnh và đường viền mảnh.",
    care: "Giặt tay bằng nước mát, không vắt xoắn và phơi phẳng trong bóng râm.",
    fit: "Bộ bralette và quần đồng bộ ôm vừa, ưu tiên cảm giác nhẹ trên da.",
    suitableFor: "Mặc nền hằng ngày hoặc phối theo nhu cầu cá nhân.",
    highlights: ["Ren mềm", "Dây vai điều chỉnh", "Bộ đồng bộ"],
  },
};

const ITEMS = [
  ["prd-125", "govpnhtkqac0pagfnhcq", "duffle", "Túi trống thể thao Compact", "Túi trống xanh đậm phối quai sáng, thiết kế gọn nhưng đủ chỗ cho quần áo và vật dụng tập luyện."],
  ["prd-126", "k46df57ljv571i6s6jas", "sportSocks", "Tất thể thao ống cao Performance", "Tất thể thao màu đen dài tới dưới gối, bo cổ chắc và có vùng dệt thoáng quanh bắp chân."],
  ["prd-127", "pxemdl7kbbqozdft0osz", "gripSocks", "Tất bóng đá Grip Crew", "Tất bóng đá cổ trung với cấu trúc dệt ôm bàn chân, phù hợp mang trong giày đinh hoặc giày futsal."],
  ["prd-128", "gel5zqvqmzvjd9ylt8za", "backpack", "Balo thể thao Multi-Compartment", "Balo thể thao xanh navy phối viền hồng, nhiều ngăn riêng để sắp xếp giày, quần áo và phụ kiện."],
  ["prd-048", "saeqo45updsqnyqksugd", "hoodiePullover", "Hoodie nam Oversized Xám Khói", "Hoodie trơn màu xám khói với thân rộng, vai hạ và túi kangaroo cho phong cách đường phố tối giản."],
  ["prd-049", "oldslzjp0ewjajnhbcn9", "hoodiePullover", "Hoodie nam Essential Đen", "Hoodie chui đầu màu đen, phom relaxed và thiết kế trơn dễ phối trong nhiều lịch trình."],
  ["prd-050", "fd24ndnqngnpghqzlejd", "hoodiePullover", "Hoodie nam Graphic Hồng", "Hoodie oversized màu hồng với họa tiết chữ trước ngực, tạo điểm nhấn trẻ trung khi mặc hằng ngày."],
  ["prd-051", "lzmt2cewczi2gra3unav", "hoodieZip", "Áo khoác hoodie nam Zip Đen", "Áo khoác hoodie màu đen có khóa kéo toàn thân, phom rộng vừa và thuận tiện mặc nhiều lớp."],
  ["prd-005", "tpp8pvysunabfu29dbuy", "denim", "Jeans nam Straight Mid Blue", "Quần jeans xanh trung dáng ống đứng, phần đùi thoải mái và bề mặt wash tự nhiên."],
  ["prd-014", "d9qcmnhi14nenwmjflbk", "denim", "Jeans nam Tapered Blue", "Quần jeans xanh dáng gọn, ống thu nhẹ từ gối xuống gấu nhưng vẫn giữ khoảng cử động ở đùi."],
  ["prd-058", "az6jqwn5ogelrjyadcj7", "denim", "Jeans nam Wide Black", "Quần jeans đen cạp vừa, ống rộng rơi thẳng và bề mặt wash tối giản."],
  ["prd-059", "tuz1erthrzmf96da2o1u", "denim", "Jeans nam Baggy Light Blue", "Quần jeans xanh nhạt dáng baggy, rộng từ hông tới gấu và phù hợp phong cách đường phố."],
  ["prd-076", "mjnoivanv5mha9dtnjqr", "sweatJogger", "Jogger nam Relaxed Black", "Quần jogger đen phom rộng vừa, cạp co giãn và ống thu gọn để mặc hằng ngày."],
  ["prd-077", "fv73tlwexvqxudkqlj9i", "sweatJogger", "Jogger nam Essential Grey", "Quần jogger xám sáng bằng vải mềm, ống bo gọn và phối tốt với áo nỉ hoặc áo thun."],
  ["prd-078", "dgyaezpr7trwj8kq8qcv", "techJogger", "Jogger nam Tech Black", "Quần jogger đen bề mặt trơn nhẹ, cạp thun bản rộng và túi hai bên tiện di chuyển."],
  ["prd-079", "kh83vdnqanugwgtp0e5u", "sweatJogger", "Jogger nam Motion Grey", "Quần jogger xám nhạt dáng gọn, cạp co giãn và phù hợp vận động nhẹ hoặc mặc thường ngày."],
  ["prd-006", "eq0r2bzefkgmeprbffcz", "chino", "Quần kaki nam Straight Ivory", "Quần kaki màu trắng ngà dáng ống đứng, cạp gọn và đường may tối giản cho phong cách công sở."],
  ["prd-066", "aiyasq2ix2rrfysplu2b", "chino", "Quần kaki nam Zip Beige", "Quần kaki màu be với khóa kéo kim loại chắc chắn và bề mặt dệt chéo đứng phom."],
  ["prd-067", "rx4yigcjqt642qhbhq60", "chino", "Quần kaki nam Tapered Black", "Quần kaki đen dáng tapered, thân quần gọn và ống thu nhẹ để dễ phối trang phục."],
  ["prd-068", "luuvdow2nimy4xvjleb5", "chino", "Quần kaki nam Relaxed Black", "Quần kaki đen dáng relaxed, ống rộng vừa và bề mặt lì phù hợp nhịp sống hằng ngày."],
  ["prd-107", "moz7tktnjenhy8yw8cze", "rashguard", "Đồ bơi nam Rashguard Full Suit", "Bộ đồ bơi liền thân màu đen, tay dài và ống dài, tăng độ che phủ khi bơi hoặc lặn nông."],
  ["prd-108", "y6l6do9idxvtxiqim7l5", "rashguard", "Bộ bơi nam Rashguard Two-Piece", "Bộ bơi nam hai mảnh phối xanh đen gồm áo tay dài và quần dài ôm thể thao."],
  ["prd-013", "pgej7rbzp6e1hw0kveqb", "polo", "Polo nam Tipped White", "Áo polo trắng phối viền xám xanh ở cổ và bo tay, tạo vẻ ngoài gọn gàng nhưng không cứng nhắc."],
  ["prd-022", "rwjy0s00sbngisq1lxns", "polo", "Polo nam Contrast Navy", "Áo polo xanh navy phối viền sáng ở cổ và tay, phom regular phù hợp phong cách smart-casual."],
  ["prd-023", "njdt9fjpyp5c5f9mupui", "polo", "Polo nam Tipped Black", "Áo polo đen phối đường viền trắng mảnh tại cổ, thiết kế tối giản và dễ mặc hằng ngày."],
  ["prd-136", "kqjrwzjauz8uksts9jog", "casualSneaker", "Sneaker nam Retro Colorblock", "Sneaker cổ thấp phối kem, navy và nâu vàng, thân nhiều lớp cùng đế trắng dày vừa."],
  ["prd-137", "xioeomerhwobun7rukwt", "runningShoe", "Giày chạy nam Mesh Charcoal", "Giày chạy màu xám than với thân lưới thoáng, dây buộc gọn và đế đệm hỗ trợ đi bộ, chạy nhẹ."],
  ["prd-138", "zfs8sqekej27hbnkdwtr", "runningShoe", "Giày chạy nam Cushion Grey", "Giày thể thao xám với thân lưới và đế đệm dày, hướng tới cảm giác êm khi di chuyển lâu."],
  ["prd-096", "kphyrxiybt7omfhd1f1e", "tailoredShort", "Quần short nam Tailored White", "Quần short trắng dáng suông, cạp có đỉa thắt lưng và chiều dài trên gối gọn gàng."],
  ["prd-088", "cyvrwf95iwofybim8isd", "loungeShort", "Quần short nam Drawstring White", "Quần short trắng cạp thun dây rút, ống rộng vừa và bề mặt mềm cho ngày nghỉ thoải mái."],
  ["prd-115", "shjhvkbmj3ko6sgqf501", "underwear", "Đồ lót nam Trunk Grey", "Quần trunk màu xám, ống ngắn ôm vừa và cạp bản trung tạo cảm giác ổn định khi mặc."],
  ["prd-116", "xtm4dthyh6ribfsx4wli", "underwear", "Đồ lót nam Trunk Logo Waistband", "Quần trunk màu tối với cạp logo tương phản, phom ôm và chiều dài ống gọn."],
  ["prd-117", "vumfpq86xj3rjuabbmiw", "underwear", "Đồ lót nam Boxer Brief Black", "Quần boxer brief màu đen, cạp bản rộng và ống dài hơn trunk để tăng độ che phủ."],
  ["prd-118", "d6sttaggx7llxu3zcfxk", "underwear", "Đồ lót nam Boxer Navy", "Quần boxer nam màu navy, phom ôm vừa và cạp mềm phù hợp mặc nền hằng ngày."],
  ["prd-262", "ut4iscg3nbhost0jolqn", "pajamasLong", "Đồ mặc nhà nữ Printed Long Set", "Bộ pijama nữ tay dài và quần dài với họa tiết đồng bộ, cổ bẻ và hàng khuy trước."],
  ["prd-263", "tichyemvft31gka1fhen", "pajamasShort", "Đồ mặc nhà nữ Printed Short Set", "Bộ mặc nhà nữ áo ngắn tay và quần short màu xám, in họa tiết nhỏ trẻ trung."],
  ["prd-264", "oq5q9npuhv38i5zoxzax", "homeCami", "Đồ mặc nhà nữ Cami Lace Set", "Bộ mặc nhà hai dây màu kem gồm áo camisole và quần short, phối ren nhẹ ở viền."],
  ["prd-010", "qlh2rm99dfllmtrb9oxi", "maxiSkirt", "Chân váy nữ Tiered Maxi White", "Chân váy maxi trắng chia nhiều tầng, phom xòe và độ rủ mềm cho chuyển động tự nhiên."],
  ["prd-223", "vhhzob6y3rqiteobbcww", "miniSkirt", "Chân váy nữ Stretch Mini", "Chân váy mini bề mặt trơn, dáng ôm vừa và có nhiều màu trung tính dễ phối."],
  ["prd-224", "jtuqdz1eaqu7zoswdelp", "skort", "Chân váy nữ Pleated Mini Brown", "Chân váy ngắn màu nâu với các nếp ly đều, cạp gọn và phong cách học đường hiện đại."],
  ["prd-225", "nhsgjcjq9no1kdutdugo", "skort", "Chân váy nữ Pleated Skort Black", "Chân váy ngắn màu đen dáng xòe, xếp ly lớn và có lớp quần trong để dễ vận động."],
  ["prd-183", "nyxjj00omesvnfsfa2ls", "hoodiePullover", "Hoodie nữ Graphic Oversized Black", "Hoodie nữ màu đen phom oversized, họa tiết chữ trước ngực và tay áo rộng thoải mái."],
  ["prd-184", "hlkjobtz6bgk8xtoonn6", "hoodieZip", "Hoodie nữ Zip White", "Áo hoodie nữ màu trắng có khóa kéo toàn thân, túi trước và phom rộng vừa."],
  ["prd-185", "c2lrnz70ud1pz4gq994v", "hoodieZip", "Hoodie nữ Zip College Grey", "Áo hoodie nữ màu xám phối logo nhỏ, khóa kéo toàn thân và phom relaxed trẻ trung."],
  ["prd-186", "bduiudhm84aobl5tpbdw", "hoodiePullover", "Hoodie nữ Graphic Light Grey", "Hoodie nữ xám sáng chui đầu, họa tiết nhỏ trước ngực và phom rộng dễ phối."],
  ["prd-012", "o6i35j8cycq2etqjuesa", "sweatshirt", "Áo nỉ nữ Cropped Collar Grey", "Áo nỉ nữ màu xám dáng cropped, cổ bẻ rộng và tay phồng nhẹ tạo điểm nhấn hiện đại."],
  ["prd-174", "zf14xuostgpaurvwesi2", "hoodieZip", "Áo khoác hoodie nữ Zip Grey", "Áo khoác hoodie nữ màu xám, khóa kéo toàn thân và phom oversized phối tốt cùng chân váy."],
  ["prd-175", "a3ohrpgo0uneq42l6vew", "utilityJacket", "Áo khoác nữ Hooded Utility Black", "Áo khoác nữ màu đen có mũ, thân dài phủ hông và các chi tiết tiện dụng cho phong cách đường phố."],
  ["prd-176", "j8sdp0ghpbunefnegf5i", "hoodieZip", "Áo khoác hoodie nữ Oversized Grey", "Áo hoodie zip màu xám sáng, thân rộng và tay dài tạo vẻ ngoài thoải mái, trẻ trung."],
  ["prd-164", "ctnmd88cxgk0jiyc1ex5", "shirt", "Áo sơ mi nữ Relaxed White", "Áo sơ mi nữ trắng dáng relaxed, tay dài và hàng khuy trước phù hợp mặc ngoài hoặc sơ vin."],
  ["prd-165", "cbmleawzxpudp7aznh3i", "shirt", "Áo sơ mi nữ Short Sleeve White", "Áo sơ mi nữ trắng tay ngắn, cổ bẻ mềm và bề mặt trơn cho ngày làm việc gọn nhẹ."],
  ["prd-166", "if6ykk7fgix3bbbgosps", "shirt", "Áo sơ mi nữ Classic Long Sleeve", "Áo sơ mi nữ tay dài phom cơ bản, có các màu trắng, đen và xanh nhạt dễ phối công sở."],
  ["prd-167", "byufz46l6u1sp0tuqvo1", "shirt", "Áo sơ mi nữ Soft Drape White", "Áo sơ mi nữ trắng có độ rủ nhẹ, phom relaxed và tay dài xắn gọn linh hoạt."],
  ["prd-241", "qgyqwkpcswh7ngt0sql3", "sportSet", "Bộ thể thao nữ Active Navy", "Bộ thể thao nữ màu navy gồm áo T-shirt gọn và quần hoặc skort đồng bộ cho vận động nhẹ."],
  ["prd-244", "luoopxuytabucx6ord2y", "sportSet", "Bộ thể thao nữ Oversized Beige", "Bộ thể thao nữ màu be gồm áo T-shirt oversized và quần short, ưu tiên sự thoải mái khi vận động."],
  ["prd-251", "jrduxemrocl0hsytptzr", "swimsuit", "Đồ bơi nữ Long-Sleeve One-Piece", "Đồ bơi nữ liền thân màu đen, tay dài và cổ cao vừa để tăng độ che phủ ngoài trời."],
  ["prd-252", "i7demtkexsli0e4yde20", "swimsuit", "Bộ bơi nữ Rashguard & Swim Skirt", "Bộ bơi nữ gồm áo rashguard tay ngắn màu hồng và chân váy bơi màu đen, phù hợp phong cách năng động."],
  ["prd-253", "jenob6niqsoul1yt705k", "swimsuit", "Đồ bơi nữ Short-Sleeve One-Piece", "Đồ bơi nữ liền thân màu đen tay ngắn, phối viền trắng ở cổ và gấu tạo vẻ thể thao."],
  ["prd-011", "oseyk1eedxhm7krnne9h", "womenTee", "Áo thun nữ Fitted Basic", "Áo thun nữ cổ tròn phom ôm vừa, tay ngắn và có nhiều màu cơ bản để mặc hằng ngày."],
  ["prd-145", "mz1bymm5cpnca3rbio32", "womenTee", "Áo thun nữ Cropped Raglan", "Áo thun nữ dáng cropped phối tay raglan tương phản, mang cảm hứng thể thao trẻ trung."],
  ["prd-146", "vlf4gh5uy9x8xere5xcb", "womenTee", "Áo thun nữ Henley White", "Áo thun nữ trắng phom ôm nhẹ, cổ Henley đính nút và viền cổ nữ tính."],
  ["prd-147", "fqvsgu4rmnpcvbjt5moo", "womenTee", "Áo thun nữ V-Neck Sage", "Áo thun nữ màu xanh xám nhạt, cổ chữ V và phom ôm vừa tôn đường nét tự nhiên."],
  ["prd-154", "aq4c9eaijoyxueet11gz", "blouse", "Áo blouse nữ Balloon Sleeve Pink", "Áo blouse nữ màu hồng với tay phồng dài, cổ mở mềm và thân áo có độ rủ nhẹ."],
  ["prd-155", "lns0c2rf5dwjhlzoqlbl", "blouse", "Áo blouse nữ Peplum Lace White", "Áo blouse nữ trắng không tay, thân peplum và viền ren ở gấu tạo điểm nhấn nữ tính."],
  ["prd-156", "awclmn0czzq6w6ado325", "blouse", "Áo blouse nữ High-Neck Tie Grey", "Áo blouse nữ màu xám cổ cao, tay phồng nhẹ và chi tiết dây dài tạo điểm nhấn thanh lịch."],
  ["prd-157", "iknlepcswxdgw58kcfzl", "blouse", "Áo blouse nữ Relaxed V-Neck Black", "Áo blouse nữ màu đen cổ chữ V, thân rộng nhẹ và bề mặt rủ phù hợp phong cách tối giản."],
  ["prd-271", "njezyz5843v6cboflvsd", "lingerie", "Bộ đồ lót nữ Soft Layer Grey Blue", "Bộ đồ lót nữ màu xanh xám gồm bralette, quần đồng bộ và lớp áo mỏng phối ngoài."],
  ["prd-272", "zdj4cznl92pfmje9vtq3", "lingerie", "Bộ đồ lót nữ Lace Black", "Bộ đồ lót nữ màu đen phối ren gồm bralette và quần đồng bộ, thiết kế dây mảnh nhẹ nhàng."],
];

function lowerFirst(value) {
  const text = String(value || "");
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "nhiều lịch trình hằng ngày";
}

function applyImageCopyMigration(data) {
  data.meta = data.meta || {};
  if (Number(data.meta.imageCopyVersion || 0) >= IMAGE_COPY_VERSION) {
    return { changed: false, updatedProducts: 0 };
  }

  const products = Array.isArray(data.products) ? data.products : [];
  let updatedProducts = 0;
  for (const [id, imageToken, profileKey, name, description] of ITEMS) {
    const product = products.find((item) => item.id === id);
    if (!product || !String(product.image || "").includes(`/products/${imageToken}`)) continue;
    const profile = PROFILES[profileKey];
    if (!profile) continue;
    Object.assign(product, {
      name,
      description,
      longDescription: `${description} ${profile.materials} ${profile.fit} Phù hợp cho ${lowerFirst(profile.suitableFor)}`,
      materials: profile.materials,
      care: profile.care,
      fit: profile.fit,
      suitableFor: profile.suitableFor,
      modelInfo: "Thông tin số đo người mẫu chưa được nguồn ảnh công bố. Vui lòng đối chiếu bảng số đo của sản phẩm trước khi chọn size.",
      highlights: [...profile.highlights],
      featureDetails: [
        { title: "Chất liệu & cấu trúc", description: profile.materials },
        { title: "Phom dáng", description: profile.fit },
        { title: "Hoàn cảnh sử dụng", description: profile.suitableFor },
      ],
      imageCopyFingerprint: imageToken,
    });
    updatedProducts += 1;
  }

  if (updatedProducts === 0) {
    return { changed: false, updatedProducts: 0 };
  }

  const migratedAt = new Date().toISOString();
  data.meta.imageCopyVersion = IMAGE_COPY_VERSION;
  data.meta.imageCopyMigratedAt = migratedAt;
  data.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  data.auditLogs.unshift({
    id: `log-${Date.now()}-image-copy`,
    action: "image_copy_migration",
    entity: "catalog",
    entityId: `v${IMAGE_COPY_VERSION}`,
    actorId: null,
    actorName: "Hệ thống",
    at: migratedAt,
    metadata: { updatedProducts },
  });
  return { changed: true, updatedProducts };
}

module.exports = {
  IMAGE_COPY_VERSION,
  ITEMS,
  applyImageCopyMigration,
};
