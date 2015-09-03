// The main thread
(function ($) {
  $( document ).ready(function() {

    // function drupalStyleIDs (data) {
    //   // Make an ID to match the drupal way ... spaces to hyphens, no ampersands and so forth
    //   $(data).each( function() {
    //     this.id = this.name.replace(/ /g, '-').replace(/,/g, '').replace(/\&/g, '').replace(/\./g, '').replace(/--/g, '-').toLowerCase(); //todo: regex...
    //   });    
    //   return data;  
    // }

    // pull in the json list of topics and then strap select 2
    // var jsonEbiTopics, jsonTopics;
    // $.when(
    //   $.getJSON('/sites/ebi.ac.uk/files/data/events-taxonomy-feed-ebi-topic.json', function(data) {
    //       jsonEbiTopics = data;
    //   }),
    //   $.getJSON('/sites/ebi.ac.uk/files/data/events-taxonomy-feed-topic.json', function(data) {
    //       jsonTopics = data;
    //   })
    // ).then(function() {
    //   if (jsonEbiTopics && jsonTopics) {
    //     // We haz data

    //     // programatically create an ID.
    //     jsonEbiTopics = drupalStyleIDs(jsonEbiTopics);
    //     jsonTopics = drupalStyleIDs(jsonTopics);

    //     // how many topics?
    //     var numberOfEntries = jsonEbiTopics.length + jsonTopics.length;
    //     $('.topic-count').html(numberOfEntries);

    //     // a "spacer"
    //     var spacerRow = [{"name":"---------","clean_path":"","count":0}]; 

    //     var combinedTopics = jsonEbiTopics.concat(spacerRow).concat(jsonTopics);

    //     function format(item) { return item.name; }
         
    //     // invoke select2
    //     $('#e1, #e2').select2({
    //       // bookmark for more options: http://select2.github.io/select2/
    //       placeholder: 'Select a topic',
    //       data:{ results: combinedTopics, text: 'name' },
    //       formatSelection: format,
    //       formatResult: format
    //     });

    //     // redirect when user selects an item
    //     $('#e1, #e2')
    //       .on("change", function(e) { 
    //         alert('logic not yet implemented: where is the right URL home for EBI topics and general topics?')
    //         window.location.href = "/about/events/topic/"+e.val;
    //         // console.log("change "+JSON.stringify({val:e.val, added:e.added, removed:e.removed})); 
    //       })

    //   }
    //   else {
    //       // A JSON request has failed ...
    //   }

    // });


    // filter out past events
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    function afterToday(obj) {
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return (new Date(obj.field_starts['value']) > tomorrow) ? true : false; 
    }

    // filter out events that aren't today
    function onToday(obj) {
      var today = new Date();
      todayText = today.getFullYear() + ' ' + (today.getMonth() + 1) + ' ' + today.getDate() ;

      var receivedDate = new Date(obj.field_starts['value'])
      receivedDate = receivedDate.getFullYear() + ' ' + (receivedDate.getMonth() + 1) + ' ' + receivedDate.getDate() ;


      return (receivedDate === todayText) ? true : false; 
    }

    // filter out future events
    function beforeToday(obj) {
      return (new Date(obj.field_starts['value']) < new Date()) ? true : false; 
    }

    // ----------------
    //invoke the handlebars template for the upcoming events list
    // ----------------
    var sourceUpcomingEvents   = $("#upcoming-events-template").html();
    var templateUpcomingEvents = Handlebars.compile(sourceUpcomingEvents);
    $.getJSON("/sites/ebi.ac.uk/files/data/events-feed-seminar.json", function(data) {
    // $.getJSON("/sites/ebi.ac.uk/files/data/events-common-fields-feed-upcoming-events-3-month.json", function(data) {
      
      // -- today's events
      var todaysSeminars = data.filter(onToday);
      todaysSeminars = { "nodes" : todaysSeminars };
      $("#todays-seminars-content-placeholder").html(templateUpcomingEvents(todaysSeminars));

      // -- upcoming events
      // sort the data chronologically
      data.sort(function (a, b) {
        if (new Date(a.field_starts['value']) > new Date(b.field_starts['value'])) {
          return 1;
        }
        if (new Date(a.field_starts['value']) < new Date(b.field_starts['value'])) {
          return -1;
        }
        return 0;
      });

      var upcomingSeminars = data.filter(afterToday);
      upcomingSeminars = { "nodes" : upcomingSeminars.slice(0,10) }; // only XX seminars wanted

      $("#upcoming-events-content-placeholder").html(templateUpcomingEvents(upcomingSeminars));


      // -- past events
      var pastSeminars = data.filter(beforeToday);
      // sort the data chronologically
      pastSeminars.sort(function (a, b) {
        // console.log(a.field_starts);
        if (new Date(a.field_starts['value']) < new Date(b.field_starts['value'])) {
          return 1;
        }
        if (new Date(a.field_starts['value']) > new Date(b.field_starts['value'])) {
          return -1;
        }
        return 0;
      });
      pastSeminars = { "nodes" : pastSeminars.slice(0,5) }; // only XX seminars wanted

      // console.log(upcomingSeminars);

      $("#past-events-content-placeholder").html(templateUpcomingEvents(pastSeminars));

      // invoke the keyword filter
      // $('#upcoming-wraper').liveFilter('#upcoming-events-content-placeholder');

    });


    // ----------------
    // Invoke the handlebars template for the featured events list
    // ----------------
    var sourceFeaturedEvents   = $("#featured-seminars-template").html();
    var templateFeaturedEvents = Handlebars.compile(sourceFeaturedEvents);

    $.getJSON("/sites/ebi.ac.uk/files/data/events-featured-events-feed-featured-seminars.json", function(data) {
      var parsedData = { "nodes" : data };

      $("#featured-seminars-content-placeholder").html(templateFeaturedEvents(parsedData));
    });

    // ----------------
    // Smooth scroll anchor links
    // ----------------
    $('a[href*=#]:not([href=#])').click(function() {
      if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
        if (target.length) {
          $('html,body').animate({
            scrollTop: target.offset().top - 100 // -100 pixels as a buffer
          }, 700);

          $(target).parent().parent().delay(1000).fadeTo(500, 0.5).fadeTo(500, 1); //flash it so the user sees it ...

          return false;
        }
      }
    });

  });
}(jQuery));  
