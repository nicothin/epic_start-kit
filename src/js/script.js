$(document).ready(function(){

  $('#gallery-thumbs').owlCarousel({
    items: 3,
    loop: true,
    center: true,
    responsive: {
      680: {
        items: 4,
      },
      800: {
        items: 5,
      },
    }
  });

  var mainImageUrl = $('#gallery-start-photo').attr('href');

  $('#gallery-main-pict').html('<img src="'+mainImageUrl+'" alt="">');

  $('#gallery-thumbs a').on('click', function(e){
    e.preventDefault();
    var imageUrl = $(this).attr('href');
    $('#gallery-main-pict').html('<img src="'+imageUrl+'" alt="">');
  });

});
