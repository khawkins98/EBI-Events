// The main thread
// again, note that we've used jquery no conflict with the variable jq111 - :(..
(function ($) {
  $( document ).ready(function() {

    function drupalStyleIDs (data) {
      // Make an ID to match the drupal way ... spaces to hyphens, no ampersands and so forth
      $(data).each( function() {
        this.id = this.name.replace(/ /g, '-').replace(/,/g, '').replace(/\&/g, '').replace(/\./g, '').replace(/--/g, '-').toLowerCase(); //todo: regex...
      });    
      return data;  
    }

    // filter out topics that have no associated nodes
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    function filterByCount(obj) {
      return (obj.count > 0) ? true : false; 
    }

    // pull in the json list of topics and then strap select 2
    var jsonEbiTopics, jsonTopics;
    $.when(
      $.getJSON('/sites/ebi.ac.uk/files/data/events-taxonomy-feed-ebi-topic.json', function(data) {
          jsonEbiTopics = data;
      }),
      $.getJSON('/sites/ebi.ac.uk/files/data/events-taxonomy-feed-topic.json', function(data) {
          jsonTopics = data.filter(filterByCount); // filter out 0 count topics
      })
    ).then(function() {
      if (jsonEbiTopics && jsonTopics) {
        // We haz data

        // programatically create an ID.
        jsonEbiTopics = drupalStyleIDs(jsonEbiTopics);
        jsonTopics = drupalStyleIDs(jsonTopics);

        // how many topics?
        var numberOfEntries = jsonEbiTopics.length + jsonTopics.length;
        $('.topic-count').html(numberOfEntries);

        // a "spacer"
        var spacerRow = [{"name":"---------","clean_path":"","count":0}]; 

        var combinedTopics = jsonEbiTopics.concat(spacerRow).concat(jsonTopics);

        function format(item) { return item.name; }
         
        // invoke select2
        $('#e1, #e2').select2({
          // bookmark for more options: http://select2.github.io/select2/
          placeholder: 'Select a topic',
          data:{ results: combinedTopics, text: 'name' },
          formatSelection: format,
          formatResult: format
        });

        // redirect when user selects an item
        $('#e1, #e2')
          .on("change", function(e) { 
            // alert('logic not yet implemented: where is the right URL home for EBI topics and general topics?')
            window.location.href = "http://wwwdev.ebi.ac.uk/about/events/topic/"+e.val;
            // console.log("change "+JSON.stringify({val:e.val, added:e.added, removed:e.removed})); 
          })

      }
      else {
          // A JSON request has failed ...
      }

    });

    // ----------------
    //invoke the handlebars template for the upcoming events list
    // ----------------
    var sourceUpcomingEvents   = $("#archived-events-template").html();
    var templateUpcomingEvents = Handlebars.compile(sourceUpcomingEvents);
    // http://wwwdev.ebi.ac.uk/sites/ebi.ac.uk/files/data/events-common-fields-feed-past-events.json
    $.getJSON("/sites/ebi.ac.uk/files/data/events-common-fields-feed-past-events.json", function(data) {
      // -- upcoming events
      // sort the data chronologically
      data.sort(function (a, b) {
        if (new Date(a.starts['value']) < new Date(b.starts['value'])) {
          return 1;
        }
        if (new Date(a.starts['value']) > new Date(b.starts['value'])) {
          return -1;
        }
        return 0;
      });


      var parsedData = { "nodes" : data };

      //console.log(data);
      
      $("#archived-events-content-placeholder").html(templateUpcomingEvents(parsedData));

      // invoke the keyword filter
      $('#upcoming-wraper').liveFilter('#archived-events-content-placeholder');

    });

    // This runs the keyword filter.
    // High level: 
    // - Splits the user's input into keyworks
    // - event:syntax filters by event
    var catgory = 'All',
        filter = '',
        expandedEventDescriptionThreshold = 5;

    $.fn.liveFilter = function (wrapper) {

      // strap the filter field as a select2 element
      $("#livefilter").select2({
        placeholder: "Filter by a keyword or two",
        // allowClear: true,
        tags:[""],
        dropdownCssClass: "lifefilter-drop",
        tokenSeparators: [",", " "]})        
      .on("change", function(e) {
        // mostly used event, fired to the original element when the value changes
         //console.log("change val=" + e.val);
        updateIncoming();
      })

      // var wrap = '#' + $(this).attr('id');
      var item = '.upcoming-event';
      $('#upcoming-wraper #s2id_livefilter').keyup(function () {
        updateIncoming();
      });

      // Target Content type
        // e.preventDefault();
        // eventType = $(this).data('value');
        var eventType = $(this).val();
        var liveFilter = $("#livefilter").val();

        if (eventType != 'reset') {         
          // $('#upcoming-wraper input.filter').val($('#upcoming-wraper input.filter').val() + ' type:' + eventType);
          
          
          eventType = 'type:'+eventType;
          // Append filter for year if sent as argument
          if($("#livefilter").val().match(/(year)+:(\d{4})/) || $("#livefilter").val().match(/(ebi-topic)+:([a-zA-Z0-9]*-){0,}[a-zA-Z0-9]*/)) {
            if($("#livefilter").val().match(/(type)+:(\w)+(\s{0,1})+(\w)+/)) {
              // Update type with incoming type
              eventType = liveFilter.replace(/(type)+:(\w)+(\s{0,1})+(\w)+/g, eventType);
              }
            else {
              // Append year if not in liveFilterbox
              eventType = eventType + ',' + $("#livefilter").val();
            }
          }
          
          $("#livefilter").val(eventType).trigger("change");
        }
        else 
        {
          eventType = liveFilter.replace(/,{0,1}(type)+:(\w)+(\s{0,1})+(\w)+/g, '');
          eventType = eventType.replace(/^,/g, ''); // Remove comma if in first position
          $("#livefilter").val(eventType).trigger("change");
          // reset filter
          //$("#livefilter").select2("val","").trigger("change");
          // $('#upcoming-wraper input.filter').val('');
        }
        updateIncoming();
      });

      // Target EBI Topic
      $("#filter-buttons input[name='ebi-topic']").click(function(e){
        // e.preventDefault();
        // eventType = $(this).data('value');
        var eventTopic = $(this).val();
        var liveFilter = $("#livefilter").val();

        if (eventTopic != 'reset') {          
          // $('#upcoming-wraper input.filter').val($('#upcoming-wraper input.filter').val() + ' type:' + eventType);
          eventTopic = 'ebi-topic:'+ eventTopic;
          // Append filter for year if sent as argument
          if($("#livefilter").val().match(/(year)+:(\d{4})/) || $("#livefilter").val().match(/(type)+:(\w)+(\s{0,1})+(\w)+/)) {
            if($("#livefilter").val().match(/(ebi-topic)+:([a-zA-Z0-9]*-){0,}[a-zA-Z0-9]*/)) {
              // Update type with incoming type
              eventTopic = liveFilter.replace(/(ebi-topic)+:([a-zA-Z0-9]*-){0,}[a-zA-Z0-9]*/g, eventTopic);
              }
            else {
              // Append year if not in liveFilterbox
              eventTopic = eventTopic + ',' + $("#livefilter").val();
            }
          }
          
          $("#livefilter").val(eventTopic).trigger("change");
        }
        else 
        {
          // reset filter
          eventTopic = liveFilter.replace(/,{0,1}(ebi-topic)+:([a-zA-Z0-9]*-){0,}[a-zA-Z0-9]*/g, '');  // Remove topic filter if none is selected
          eventTopic = eventTopic.replace(/^,/g, ''); // Remove comma if in first position
          $("#livefilter").val(eventTopic).trigger("change");
          //$("#livefilter").select2("val","").trigger("change");
          // $('#upcoming-wraper input.filter').val('');
        }
        updateIncoming();
      });
      
      // Target year
      $('#filter-buttons select').on('change', '', function(e){
        // e.preventDefault();
        // eventType = $(this).data('value');
        var filterTag = $(this).val();
        var liveFilter = $("#livefilter").val(); 
            
        if (filterTag != 'select_a_year') {
          // $('#upcoming-wraper input.filter').val($('#upcoming-wraper input.filter').val() + ' type:' + eventType);       
          var yearPattern = '/(year)+:(\d{4})/';
          var typePattern = '/(type)+:(\w)+(\s{0,1})+(\w)+/';         
          var regex = new RegExp(typePattern, "g");

          filterTag = 'year:'+filterTag;
          // Append filter for content type if sent as argument
          
          if($("#livefilter").val().match(/(type)+:(\w)+(\s{0,1})+(\w)+/) || $("#livefilter").val().match(/(ebi-topic)+:([a-zA-Z0-9]*-){0,}[a-zA-Z0-9]*/)) {
            if($("#livefilter").val().match(/(year)+:(\d{4})/)) {
              // Update year with incoming year
              filterTag = liveFilter.replace(/(year)+:(\d{4})/g, filterTag);
              }
            else {
              // Append year if not in liveFilterbox
              filterTag = filterTag + ',' + $("#livefilter").val();
            }
          } 
          $("#livefilter").val(filterTag).trigger("change");                    
        }
        else 
        {
          // reset filter
          filterTag = liveFilter.replace(/,{0,1}(year)+:(\d{4})/g, '');  // Remove topic filter if none is selected
          filterTag = filterTag.replace(/^,/g, ''); // Remove comma if in first position
          $("#livefilter").val(filterTag).trigger("change");
          
          //$("#livefilter").select2("val","").trigger("change");
          // $('#upcoming-wraper input.filter').val('');
        }
        updateIncoming();

      });

      function updateIncoming() {
        var inputString = $('#upcoming-wraper #s2id_livefilter').text().toLowerCase() + " " + $('.select2-results-dept-0.select2-result.select2-result-selectable.select2-highlighted').text().toLowerCase();
        // console.log(inputString);
        filter = $(inputString);
        // console.log(filter.selector);
        var filterArray = filter.selector.split(" "); // an array of what we're to search for

        // console.log($(wrapper + ' ' + item + ':visible' ));

        $(wrapper + ' ' + item).each( function() { // search each entry
          var targetDiv = $(this);
          
          //console.log(targetDiv);

          $(filterArray).each( function() { // search for each term

            var individualSearchTerm = this;
            
            if (individualSearchTerm.toLowerCase().indexOf('year:') >= 0) { // year filter
              individualSearchTerm = individualSearchTerm.toLowerCase().substring(5,100); // drop the "topic:"
              
              if ($(targetDiv).find('.event-date').text().toLowerCase().indexOf(individualSearchTerm) >= 0)  { 
                $(targetDiv).show();
              } else {
                $(targetDiv).hide();
                return false; // aka break
              }
            } 
            else if (individualSearchTerm.toLowerCase().indexOf('ebi-topic:') >= 0) { // topic filter
                individualSearchTerm = individualSearchTerm.toLowerCase().substring(10,200);

                if ($(targetDiv).find('.event-ebi-topic').text().toLowerCase().indexOf(individualSearchTerm) >= 0)  { 
                  $(targetDiv).show();
                } else {
                  $(targetDiv).hide();
                  return false; // aka break
                }
                
            }
            else if (individualSearchTerm.toLowerCase().indexOf('type:') >= 0) { // type filter
              individualSearchTerm = individualSearchTerm.toLowerCase().substring(5,100); // drop the "topic:"
              
              if ($(targetDiv).find('.event-type').text().toLowerCase().indexOf(individualSearchTerm) >= 0)  { 
                $(targetDiv).show();
              } else {
                $(targetDiv).hide();
                return false; // aka break
              }
              
            } else if ($(targetDiv).text().toLowerCase().indexOf(individualSearchTerm) >= 0) { // normal search
              $(targetDiv).show();
            } else { // no matches? you don't belong, go away
              $(targetDiv).hide();
              return false; // aka break
            }
          });

          // var eventsShownCount = $(item + ':visible').length;

          // if (eventsShownCount < expandedEventDescriptionThreshold) {
          //   $('.flyout.hidden').show();
          // } else {
          //   $('.flyout.hidden').hide();
          // }
        });
      }
    }



    // ----------------
    // Smooth scroll anchor links
    // ----------------
    // $('a[href*=#]:not([href=#])').click(function() {
    //   if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
    //     var target = $(this.hash);
    //     target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
    //     if (target.length) {
    //       $('html,body').animate({
    //         scrollTop: target.offset().top - 100 // -100 pixels as a buffer
    //       }, 700);
    //       $(target).parent().parent().delay(1000).fadeTo(500, 0.5).fadeTo(500, 1); //flash it so the user sees it ...
    //       return false;
    //     }
    //   }
    // });

  });
}(jq111));  
