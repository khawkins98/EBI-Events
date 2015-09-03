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

      // Tokenise filter options
      $('#filter-buttons input, #filter-buttons select').on('change', '', function(e){
        var targetVal          = $(this).val(),
            liveFilterType     = this.name,
            liveFilterVal      = $("#livefilter").val(),
            liveFilterNewValue = '';

        // Before we add a new token, remove all existing tokens for this type
        // console.log('clearning for:',liveFilterType);
        var regexQuery = new RegExp(',{0,1}('+liveFilterType+')+:(\\w)+(\\s{0,1})+(\\w)+', "g");
        var targetValPurged = liveFilterVal.replace(regexQuery, '');
        targetValPurged = targetValPurged.replace(/^,/g, ''); // Remove comma if in first position

        // this is our search string with the old token removed
        liveFilterNewValue = targetValPurged;

        if (targetVal != 'reset') {         
          // Create the token, a ala: "year:2011"
          targetVal = liveFilterType+':'+targetVal;
          // Append the new token
          liveFilterNewValue = targetVal + ',' + liveFilterNewValue;
        }

        // Replace any double commas, or trailing commas
        liveFilterNewValue = liveFilterNewValue.replace(/,+$/, "").replace(/,(?=,)/g, ',g');
        // Update the text box
        $("#livefilter").val(liveFilterNewValue).trigger("change");
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