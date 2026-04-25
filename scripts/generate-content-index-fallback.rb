#!/usr/bin/env ruby
# frozen_string_literal: true

require "digest"
require "fileutils"
require "json"
require "set"
require "time"
require "yaml"

ROOT = Dir.pwd
ENTRIES_DIR = File.join(ROOT, "content", "entries")
OUTPUT_DIR = File.join(ROOT, "src", "generated")
OUTPUT_FILE = File.join(OUTPUT_DIR, "entries.generated.json")
WEB_OUTPUT_FILE = File.join(OUTPUT_DIR, "entries.web.generated.json")
DETAILS_OUTPUT_FILE = File.join(OUTPUT_DIR, "entry-details.generated.json")
PUBLIC_CATALOG_DIR = File.join(ROOT, "public", "catalog")
PUBLIC_MOBILE_CATALOG_DIR = File.join(ROOT, "public", "mobile-catalog")
EDITORIAL_TIME_ZONE = "Africa/Johannesburg"
SCHEMA_VERSION = 1

# Keep this fallback in sync with scripts/generate-content-index.mjs.
CATEGORY_DEFINITIONS = [
  {
    "title" => "Core concepts",
    "description" => "Terms people use as if they were self-explanatory, usually before the definitions start fraying.",
  },
  {
    "title" => "Cultural terms",
    "description" => "The social weirdness around AI: belief, taste, cringe, status games, and the internet behaving as it usually does when handed a new machine.",
  },
  {
    "title" => "Model building",
    "description" => "How models are trained, tuned, evaluated, and occasionally overpraised.",
  },
  {
    "title" => "Model usage",
    "description" => "What it means to actually run a model in production, where invoices and latency live.",
  },
  {
    "title" => "Agents and workflows",
    "description" => "Automation patterns, orchestration, and the difference between useful autonomy and stagecraft.",
  },
  {
    "title" => "Retrieval and memory",
    "description" => "How systems fetch context, store traces, and pretend they remember you.",
  },
  {
    "title" => "Product and vendor terms",
    "description" => "Company names, product labels, and the branding haze around them.",
  },
  {
    "title" => "Safety and evaluation",
    "description" => "Guardrails, tests, preferences, and the uncomfortable gap between lab scores and reality.",
  },
  {
    "title" => "Infrastructure and deployment",
    "description" => "The machinery underneath the demo: compute, serving, throughput, and operational trade-offs.",
  },
  {
    "title" => "Economics and operations of AI",
    "description" => "Cost, labour, incentives, and the very unmagical business of running AI systems.",
  },
].freeze

DIFFICULTY_OPTIONS = %w[beginner intermediate advanced].freeze
TECHNICAL_DEPTH_OPTIONS = %w[low medium high].freeze
HYPE_LEVEL_OPTIONS = %w[low medium high severe].freeze
CATEGORY_TITLE_SET = CATEGORY_DEFINITIONS.map { |category| category["title"] }.to_set

def slugify(value)
  value.downcase.gsub("&", " and ").gsub(/[^a-z0-9]+/, "-").gsub(/^-+|-+$/, "")
end

def non_empty_string?(value)
  value.is_a?(String) && !value.strip.empty?
end

def normalize_frontmatter_value(value)
  case value
  when String
    value
  when Array
    value.map { |item| normalize_frontmatter_value(item) }
  when Hash
    value.each_with_object({}) do |(key, child), normalized|
      normalized[key] = normalize_frontmatter_value(child)
    end
  else
    value
  end
end

def string_array?(value)
  value.is_a?(Array) && value.all? { |item| non_empty_string?(item) }
end

def valid_date_string?(value)
  return false unless non_empty_string?(value)

  Time.parse(value)
  true
rescue ArgumentError
  false
end

def collect_entry_validation_errors(entry, known_slugs: nil)
  errors = []
  %w[
    title slug letter devilDefinition plainDefinition whyExists misuse practicalMeaning
    example publishedAt updatedAt difficulty technicalDepth hypeLevel
  ].each do |field|
    errors << "Missing required field \"#{field}\"" unless non_empty_string?(entry[field])
  end

  if non_empty_string?(entry["letter"])
    if entry["letter"].length == 1
      entry["letter"] = entry["letter"].upcase
    else
      errors << "Field \"letter\" must be exactly one character, got \"#{entry["letter"]}\""
    end
  end

  errors << 'Field "publishedAt" must be a valid ISO date string' unless valid_date_string?(entry["publishedAt"])
  errors << 'Field "updatedAt" must be a valid ISO date string' unless valid_date_string?(entry["updatedAt"])
  errors << "Invalid difficulty \"#{entry["difficulty"]}\"" unless DIFFICULTY_OPTIONS.include?(entry["difficulty"])
  errors << "Invalid technicalDepth \"#{entry["technicalDepth"]}\"" unless TECHNICAL_DEPTH_OPTIONS.include?(entry["technicalDepth"])
  errors << "Invalid hypeLevel \"#{entry["hypeLevel"]}\"" unless HYPE_LEVEL_OPTIONS.include?(entry["hypeLevel"])

  if !entry["categories"].is_a?(Array) || entry["categories"].empty?
    errors << 'Field "categories" must be a non-empty array'
  else
    entry["categories"].each do |category|
      unless non_empty_string?(category)
        errors << 'Field "categories" must contain only non-empty strings'
        next
      end

      errors << "Unknown category \"#{category}\"" unless CATEGORY_TITLE_SET.include?(category)
    end
  end

  if !entry["askNext"].is_a?(Array) || entry["askNext"].empty?
    errors << 'Field "askNext" must be a non-empty array'
  elsif !entry["askNext"].all? { |item| non_empty_string?(item) }
    errors << 'Field "askNext" must contain only non-empty strings'
  end

  %w[aliases related seeAlso vendorReferences tags].each do |field|
    next if entry[field].nil?

    errors << "Field \"#{field}\" must be an array of non-empty strings" unless string_array?(entry[field])
  end

  unless entry["translations"].nil?
    valid = entry["translations"].is_a?(Array) && entry["translations"].all? do |translation|
      translation.is_a?(Hash) &&
        non_empty_string?(translation["label"]) &&
        non_empty_string?(translation["text"])
    end
    errors << 'Field "translations" must be an array of { label, text } objects with non-empty strings' unless valid
  end

  if known_slugs && entry["related"].is_a?(Array)
    entry["related"].each do |related_slug|
      next unless non_empty_string?(related_slug)

      errors << "Unknown related slug \"#{related_slug}\"" unless known_slugs.include?(related_slug)
    end
  end

  errors
end

def assert_valid_entry(entry, filename:, known_slugs: nil)
  errors = collect_entry_validation_errors(entry, known_slugs: known_slugs)
  return if errors.empty?

  raise "Validation failed for #{filename}:\n  - #{errors.join("\n  - ")}"
end

def build_search_text(entry)
  [
    entry["title"],
    Array(entry["aliases"]).join(" "),
    Array(entry["categories"]).join(" "),
    Array(entry["tags"]).join(" "),
    entry["devilDefinition"] || "",
    entry["plainDefinition"] || "",
    entry["whyExists"] || "",
    entry["misuse"] || "",
    entry["practicalMeaning"] || "",
    entry["example"] || "",
    Array(entry["askNext"]).join(" "),
    Array(entry["seeAlso"]).join(" "),
    entry["note"] || "",
    Array(entry["vendorReferences"]).join(" "),
  ].join(" ").strip
end

def title_sort_value(value)
  value.to_s.downcase
end

def timestamp_sort_value(value)
  Time.parse(value.to_s).to_i
rescue ArgumentError, TypeError
  0
end

def stable_json(value)
  case value
  when Hash
    "{#{value.keys.map(&:to_s).sort.map { |key| "#{JSON.generate(key)}:#{stable_json(value[key])}" }.join(",")}}"
  when Array
    "[#{value.map { |item| stable_json(item) }.join(",")}]"
  else
    JSON.generate(value)
  end
end

def create_catalog_version_seed(catalog)
  {
    "schemaVersion" => SCHEMA_VERSION,
    "entryCount" => catalog["entries"].length,
    "entries" => catalog["entries"],
    "recentSlugs" => catalog["recentSlugs"],
    "misunderstoodSlugs" => catalog["misunderstoodSlugs"],
    "letterStats" => catalog["letterStats"],
    "categoryStats" => catalog["categoryStats"],
    "editorialTimeZone" => catalog["editorialTimeZone"],
    "dailyWordStartDate" => catalog["dailyWordStartDate"],
    "dailyWordSlugs" => catalog["dailyWordSlugs"],
    "featuredSlug" => catalog["featuredSlug"],
    "latestPublishedAt" => catalog["latestPublishedAt"],
    "publishedEntryBatches" => catalog["publishedEntryBatches"],
  }
end

files = Dir.children(ENTRIES_DIR).select { |file| file.end_with?(".mdx") }.sort
raw_entries_with_files = files.map do |filename|
  source = File.read(File.join(ENTRIES_DIR, filename))
  match = source.match(/\A---\n(.*?)\n---\n?/m)
  raise "Missing frontmatter in #{filename}" unless match

  frontmatter = "#{match[1]}\n"
  content = source[(match[0].length)..] || ""
  data = normalize_frontmatter_value(
    (YAML.safe_load(frontmatter, permitted_classes: [], aliases: true) || {})
      .reject { |_, value| value.nil? },
  )
  entry = data.merge(
    "aliases" => data["aliases"] || [],
    "related" => data["related"] || [],
    "seeAlso" => data["seeAlso"] || [],
    "vendorReferences" => data["vendorReferences"] || [],
    "tags" => data["tags"] || [],
    "isVendorTerm" => data.key?("isVendorTerm") ? data["isVendorTerm"] : false,
    "misunderstoodScore" => data.key?("misunderstoodScore") ? data["misunderstoodScore"] : 3,
    "translations" => data["translations"] || [],
    "body" => content.strip,
  )
  assert_valid_entry(entry, filename: filename)
  { "entry" => entry, "filename" => filename }
end

raw_entries = raw_entries_with_files.map { |pair| pair["entry"] }
known_slugs = raw_entries.map { |entry| entry["slug"] }
raise "Duplicate entry slugs were found in content/entries." unless known_slugs.uniq.length == known_slugs.length

known_slug_set = known_slugs.to_set
raw_entries_with_files.each do |pair|
  assert_valid_entry(pair["entry"], filename: pair["filename"], known_slugs: known_slug_set)
end

entry_by_slug = {}
raw_entries.each { |entry| entry_by_slug[entry["slug"]] = entry }

raw_entries.each do |entry|
  manual = []
  Array(entry["related"]).each do |slug|
    related_entry = entry_by_slug[slug]
    manual << related_entry["slug"] if related_entry
  end

  scored = []
  raw_entries.each do |candidate|
    next if candidate["slug"] == entry["slug"]

    shared_categories = candidate["categories"].count { |category| entry["categories"].include?(category) }
    shared_tags = Array(candidate["tags"]).count { |tag| Array(entry["tags"]).include?(tag) }
    score = (shared_categories * 4) + (shared_tags * 2)
    score += 1 if candidate["isVendorTerm"] == entry["isVendorTerm"]
    score += 1 if candidate["technicalDepth"] == entry["technicalDepth"]
    score += 1 if candidate["difficulty"] == entry["difficulty"]
    next if score <= 0

    scored << {
      "slug" => candidate["slug"],
      "score" => score,
      "title" => candidate["title"],
    }
  end

  scored.sort_by! { |item| [-item["score"], title_sort_value(item["title"])] }

  seen = Set.new
  result = []
  (manual + scored.map { |item| item["slug"] }).each do |slug|
    next if seen.include?(slug)

    seen << slug
    result << slug
    break if result.length >= 3
  end

  entry["_relatedSlugs"] = result
end

entries = raw_entries.map do |entry|
  enriched = entry.dup
  enriched["categorySlugs"] = entry["categories"].map { |category| slugify(category) }
  enriched["url"] = "/dictionary/#{entry["slug"]}"
  enriched["searchText"] = build_search_text(entry)
  enriched["relatedSlugs"] = entry["_relatedSlugs"] || []
  enriched.delete("_relatedSlugs")
  enriched
end

entries.sort_by! { |entry| title_sort_value(entry["title"]) }

recent_slugs = entries
  .sort_by { |entry| [-Time.parse(entry["publishedAt"]).to_i, title_sort_value(entry["title"])] }
  .first(4)
  .map { |entry| entry["slug"] }

latest_published_at =
  entries.map { |entry| entry["publishedAt"] }.max_by { |value| Time.parse(value).to_i } || ""
published_entry_batches = entries
  .group_by { |entry| entry["publishedAt"] }
  .map do |published_at, batch_entries|
    {
      "publishedAt" => published_at,
      "count" => batch_entries.length,
      "slugs" => batch_entries.map { |entry| entry["slug"] },
    }
  end
  .sort_by { |batch| -timestamp_sort_value(batch["publishedAt"]) }

misunderstood_slugs = entries
  .sort_by do |entry|
    [
      -entry["misunderstoodScore"].to_i,
      -timestamp_sort_value(entry["updatedAt"]),
      -timestamp_sort_value(entry["publishedAt"]),
      title_sort_value(entry["title"]),
      entry["slug"].to_s,
    ]
  end
  .first(4)
  .map { |entry| entry["slug"] }

letter_counts = Hash.new(0)
entries.each { |entry| letter_counts[entry["letter"]] += 1 }

letter_stats = ("A".."Z").map do |letter|
  {
    "letter" => letter,
    "count" => letter_counts[letter],
    "href" => "/dictionary?letter=#{letter}",
  }
end

category_stats = CATEGORY_DEFINITIONS.map do |category|
  category_slug = slugify(category["title"])
  matching = entries.select { |entry| entry["categorySlugs"].include?(category_slug) }
  {
    "title" => category["title"],
    "description" => category["description"],
    "slug" => category_slug,
    "count" => matching.length,
    "sampleTerms" => matching.first(3).map { |entry| entry["title"] },
  }
end

daily_word_entries = entries.sort_by { |entry| [entry["publishedAt"], entry["slug"]] }
daily_word_start_date = daily_word_entries.first ? daily_word_entries.first["publishedAt"] : ""

featured_slug =
  recent_slugs.first ||
  daily_word_entries.last&.fetch("slug", nil) ||
  entries.first&.fetch("slug", nil)

raise "Could not derive a featured entry from the catalog" unless non_empty_string?(featured_slug)

catalog = {
  "entries" => entries,
  "recentSlugs" => recent_slugs,
  "misunderstoodSlugs" => misunderstood_slugs,
  "letterStats" => letter_stats,
  "categoryStats" => category_stats,
  "editorialTimeZone" => EDITORIAL_TIME_ZONE,
  "dailyWordStartDate" => daily_word_start_date,
  "dailyWordSlugs" => daily_word_entries.map { |entry| entry["slug"] },
  "featuredSlug" => featured_slug,
  "latestPublishedAt" => latest_published_at,
  "publishedEntryBatches" => published_entry_batches,
}

catalog_version = Digest::SHA256.hexdigest(stable_json(create_catalog_version_seed(catalog)))
generated_at = Time.now.utc.iso8601(3)
begin
  existing_snapshot = JSON.parse(File.read(OUTPUT_FILE))
  if existing_snapshot["catalogVersion"] == catalog_version && non_empty_string?(existing_snapshot["generatedAt"])
    generated_at = existing_snapshot["generatedAt"]
  end
rescue Errno::ENOENT, JSON::ParserError
  # No previous generated snapshot to reconcile against.
end
output = {
  "schemaVersion" => SCHEMA_VERSION,
  "catalogVersion" => catalog_version,
  "generatedAt" => generated_at,
  "entryCount" => entries.length,
}.merge(catalog)
snapshot_text = "#{JSON.generate(output)}\n"
entry_details = entries.each_with_object({}) do |entry, details|
  details[entry["slug"]] = {
    "body" => entry["body"],
    "note" => entry["note"],
    "seeAlso" => entry["seeAlso"],
    "translations" => entry["translations"],
    "vendorReferences" => entry["vendorReferences"],
    "warningLabel" => entry["warningLabel"],
  }
end
web_output = output.merge(
  "entries" => entries.map do |entry|
    entry.reject do |key, _value|
      %w[
        body note searchText categorySlugs related seeAlso translations url
        vendorReferences warningLabel
      ].include?(key)
    end
  end,
)
web_snapshot_text = "#{JSON.generate(web_output)}\n"

versioned_catalog_filename = "catalog.#{catalog_version}.json"
versioned_catalog_path = File.join(PUBLIC_CATALOG_DIR, versioned_catalog_filename)
version_manifest_path = File.join(PUBLIC_CATALOG_DIR, "version.json")
version_manifest = {
  "version" => catalog_version,
  "generatedAt" => generated_at,
  "path" => "/catalog/#{versioned_catalog_filename}",
}
mobile_snapshot_filename = "entries.#{catalog_version}.json"
mobile_snapshot_path = "/mobile-catalog/#{mobile_snapshot_filename}"
mobile_manifest_path = File.join(PUBLIC_MOBILE_CATALOG_DIR, "manifest.json")
mobile_snapshot_file = File.join(PUBLIC_MOBILE_CATALOG_DIR, mobile_snapshot_filename)
mobile_manifest = {
  "schemaVersion" => SCHEMA_VERSION,
  "catalogVersion" => catalog_version,
  "entryCount" => entries.length,
  "latestPublishedAt" => latest_published_at,
  "publishedAt" => generated_at,
  "snapshotPath" => mobile_snapshot_path,
  "sha256" => Digest::SHA256.hexdigest(snapshot_text),
  "bytes" => snapshot_text.bytesize,
}

FileUtils.mkdir_p(OUTPUT_DIR)
File.write(OUTPUT_FILE, snapshot_text)
File.write(WEB_OUTPUT_FILE, web_snapshot_text)
File.write(DETAILS_OUTPUT_FILE, "#{JSON.generate(entry_details)}\n")

FileUtils.mkdir_p(PUBLIC_CATALOG_DIR)
Dir.glob(File.join(PUBLIC_CATALOG_DIR, "catalog.*.json")).each do |path|
  File.delete(path) unless File.basename(path) == versioned_catalog_filename
end

File.write(versioned_catalog_path, snapshot_text)
File.write(version_manifest_path, "#{JSON.pretty_generate(version_manifest)}\n")

FileUtils.mkdir_p(PUBLIC_MOBILE_CATALOG_DIR)
Dir.glob(File.join(PUBLIC_MOBILE_CATALOG_DIR, "entries.*.json")).each do |path|
  File.delete(path) unless File.basename(path) == mobile_snapshot_filename
end
File.write(mobile_snapshot_file, snapshot_text)
File.write(mobile_manifest_path, "#{JSON.pretty_generate(mobile_manifest)}\n")

puts "Generated #{entries.length} dictionary entries into #{OUTPUT_FILE.sub("#{ROOT}/", "")}"
puts "Published catalog manifest #{version_manifest_path.sub("#{ROOT}/", "")} -> #{version_manifest["path"]}"
puts "Published mobile catalog manifest #{mobile_manifest_path.sub("#{ROOT}/", "")} -> #{mobile_manifest["snapshotPath"]}"
